#!/bin/bash
# Campaign 3 Pipeline v2: Multiple contacts per company
# Pulls up to 3 contacts per company, skips emails already in Instantly

set -euo pipefail

APOLLO_KEY=$(grep APOLLO_API_KEY /Users/rb/Documents/coding_projects/sm_demo/.env.local | cut -d= -f2)
INSTANTLY_KEY=$(grep INSTANTLY_API_KEY /Users/rb/Documents/coding_projects/sm_demo/.env.local | cut -d= -f2)
CAMPAIGN_ID="7126cdf0-b493-4207-b97e-69710820ca07"

TITLES='["Digital Sales Manager","Digital Marketing Manager","Online Sales Manager","VP Sales","Vice President of Sales","Vice President Sales and Marketing","Director of Sales","VP Sales and Marketing","Design Center Manager","Design Center Director","Design Studio Manager","Director of Marketing","VP Marketing","Vice President of Marketing","Marketing Director","Sales Director","Director of Design"]'

# Track emails we've already added (from first run)
# existing emails tracked via file
while IFS='|' read -r company name title email rest; do
  echo "$email" >> /tmp/c3-existing-emails.txt
done < /tmp/c3-success.txt

process_company_multi() {
  local company_name="$1"
  local floorplan="$2"
  local subject="$3"
  local added=0

  echo "=== $company_name ==="

  # Search Apollo for up to 10 matches, we'll pick best 3
  local search_result=$(curl -s -X POST "https://api.apollo.io/api/v1/mixed_people/api_search" \
    -H "Content-Type: application/json" \
    -H "X-Api-Key: $APOLLO_KEY" \
    -d "{
      \"q_organization_name\": \"$company_name\",
      \"person_titles\": $TITLES,
      \"per_page\": 10,
      \"page\": 1
    }")

  local total=$(echo "$search_result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total_entries',0))" 2>/dev/null)

  if [ "$total" = "0" ]; then
    echo "  NO CONTACTS"
    return
  fi

  # Get person IDs for up to 3 unique people (different titles preferred)
  local person_data=$(echo "$search_result" | python3 -c "
import sys, json
data = json.load(sys.stdin)
seen_titles = set()
results = []
for p in data.get('people', []):
    title = p.get('title', '')
    pid = p.get('id', '')
    first = p.get('first_name', '')
    last_obf = p.get('last_name_obfuscated', '')
    # Skip if we already have someone with a very similar title
    title_key = title.lower().replace('vice president', 'vp').replace('director', 'dir')[:20]
    if title_key in seen_titles:
        continue
    seen_titles.add(title_key)
    results.append(f'{pid}|{first}|{last_obf}|{title}')
    if len(results) >= 3:
        break
for r in results:
    print(r)
" 2>/dev/null)

  if [ -z "$person_data" ]; then
    echo "  NO MATCHES"
    return
  fi

  # Reveal and add each person
  while IFS='|' read -r person_id first_name last_obf title; do
    # Reveal
    local reveal_result=$(curl -s -X POST "https://api.apollo.io/api/v1/people/bulk_match" \
      -H "Content-Type: application/json" \
      -H "X-Api-Key: $APOLLO_KEY" \
      -d "{\"details\": [{\"id\": \"$person_id\"}], \"reveal_personal_emails\": true}")

    local full_name=$(echo "$reveal_result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['matches'][0].get('name',''))" 2>/dev/null)
    local last_name=$(echo "$reveal_result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['matches'][0].get('last_name',''))" 2>/dev/null)
    local email=$(echo "$reveal_result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['matches'][0].get('email','') or '')" 2>/dev/null)
    local linkedin=$(echo "$reveal_result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['matches'][0].get('linkedin_url','') or '')" 2>/dev/null)

    if [ -z "$email" ] || [ "$email" = "None" ] || [ "$email" = "" ]; then
      echo "  SKIP (no email): $full_name | $title"
      continue
    fi

    # Skip if already in Instantly
    if grep -qF "$email" /tmp/c3-existing-emails.txt 2>/dev/null; then
      echo "  SKIP (already added): $email"
      continue
    fi

    # Add to Instantly
    local add_result=$(curl -s -X POST "https://api.instantly.ai/api/v2/leads" \
      -H "Authorization: Bearer $INSTANTLY_KEY" \
      -H "Content-Type: application/json" \
      -d "{
        \"campaign_id\": \"$CAMPAIGN_ID\",
        \"email\": \"$email\",
        \"first_name\": \"$first_name\",
        \"last_name\": \"$last_name\",
        \"company_name\": \"$company_name\",
        \"custom_variables\": {
          \"floorplan\": \"$floorplan\",
          \"subject\": \"$subject\"
        }
      }")

    local lead_id=$(echo "$add_result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id','FAILED'))" 2>/dev/null)

    if [ "$lead_id" != "FAILED" ]; then
      echo "  ADDED: $full_name | $title | $email"
      echo "$company_name|$full_name|$title|$email|$linkedin|$floorplan|$subject" >> /tmp/c3-success.txt
      echo "$email" >> /tmp/c3-existing-emails.txt
      added=$((added + 1))
    fi

    sleep 0.5
  done <<< "$person_data"

  echo "  ($added new contacts added)"
  sleep 0.5
}

echo "Starting C3 Multi-Contact Pipeline - $(date)"
echo "Existing leads: $(wc -l < /tmp/c3-success.txt)"
echo ""

# All companies
process_company_multi "Bloomfield Homes" "Bellflower" "bellflower kitchen"
process_company_multi "Adams Homes" "Town Creek Trails" "town creek trails kitchen"
process_company_multi "LGI Homes" "Driftwood" "driftwood kitchen"
process_company_multi "Sitterle Homes" "Dijon" "dijon kitchen"
process_company_multi "Saratoga Homes" "Bellagio" "bellagio kitchen"
process_company_multi "Homes by Taber" "Shiloh" "shiloh kitchen"
process_company_multi "Allen Edwin Homes" "Elements 2700" "elements 2700 kitchen"
process_company_multi "Hayden Homes" "Harrison" "harrison kitchen"
process_company_multi "Keystone Custom Homes" "Augusta" "augusta kitchen"
process_company_multi "GHO Homes" "Venetian" "venetian kitchen"
process_company_multi "Goodwyn Building" "Brittany" "brittany kitchen"
process_company_multi "Alexander Scott Homes" "Bradford" "bradford kitchen"
process_company_multi "Trademark Quality Homes" "Pendleton" "pendleton kitchen"
process_company_multi "Harris Doyle Homes" "Franklin" "franklin kitchen"
process_company_multi "Kerley Family Homes" "Washington" "washington kitchen"
process_company_multi "Silverstone Communities" "Danbury" "danbury kitchen"
process_company_multi "Paran Homes" "Piedmont" "piedmont kitchen"
process_company_multi "TBG Homes" "Athena" "athena kitchen"
process_company_multi "Valor Communities" "Rosemary III" "rosemary III kitchen"
process_company_multi "Woodland Homes" "Brookshire Grand" "brookshire grand kitchen"
process_company_multi "Dream Finders Homes" "Avalon" "avalon kitchen"
process_company_multi "David Weekley Homes" "Baileywood" "baileywood kitchen"
process_company_multi "Eastwood Homes" "Charleston" "charleston kitchen"
process_company_multi "Stanley Martin Homes" "Sutton" "sutton kitchen"
process_company_multi "Neal Communities" "Captiva" "captiva kitchen"
process_company_multi "Ashton Woods Homes" "Scarlet" "scarlet kitchen"
process_company_multi "Smith Douglas Homes" "Caldwell" "caldwell kitchen"
process_company_multi "Classic Homes" "Monarch" "monarch kitchen"
process_company_multi "New Tradition Homes" "Laurelhurst" "laurelhurst kitchen"
process_company_multi "CBH Homes" "Capri" "capri kitchen"
process_company_multi "Challenger Homes" "Charleston" "charleston kitchen"
process_company_multi "Pahlisch Homes" "Bentley" "bentley kitchen"
process_company_multi "Highland Homes" "Wildflower Ranch" "wildflower ranch kitchen"
process_company_multi "Dunhill Homes" "Madelyn" "madelyn kitchen"
process_company_multi "Scott Felder Homes" "Travis" "travis kitchen"
process_company_multi "Westin Homes" "Jaxson" "jaxson kitchen"
process_company_multi "Shaddock Homes" "Albany" "albany kitchen"
process_company_multi "True Homes" "Lenox" "lenox kitchen"
process_company_multi "McKee Homes" "Promenade" "promenade kitchen"
process_company_multi "Homes by Dickerson" "Jubilee House" "jubilee house kitchen"
process_company_multi "Logan Homes" "Alder" "alder kitchen"
process_company_multi "Ole South Properties" "Park Place" "park place kitchen"
process_company_multi "Celebration Homes" "Hadley" "hadley kitchen"
process_company_multi "Holiday Builders" "Sanibel" "sanibel kitchen"
process_company_multi "Christopher Alan Homes" "Captiva" "captiva kitchen"
process_company_multi "Highland Homes FL" "Shelby" "shelby kitchen"
process_company_multi "Park Square Homes" "Hampton II" "hampton II kitchen"
process_company_multi "Maronda Homes" "Somerset" "somerset kitchen"
process_company_multi "Miramonte Homes" "Aries" "aries kitchen"
process_company_multi "Main Street Homes" "Monterey" "monterey kitchen"
process_company_multi "Craftmark Homes" "Strathmore" "strathmore kitchen"
process_company_multi "Fischer Homes" "DaVinci" "davinci kitchen"
process_company_multi "Rockford Homes" "Taylor" "taylor kitchen"
process_company_multi "Schumacher Homes" "Charleston" "charleston kitchen"
process_company_multi "Davis Building Group" "Lancaster" "lancaster kitchen"
process_company_multi "Wayne Homes" "Chesapeake" "chesapeake kitchen"
process_company_multi "Chesapeake Homes" "Iris" "iris kitchen"
process_company_multi "Caldwell Homes" "Cardinal" "cardinal kitchen"
process_company_multi "Drees Homes" "Grayford" "grayford kitchen"
process_company_multi "M/I Homes" "Nolan" "nolan kitchen"
process_company_multi "Mattamy Homes" "Bexley" "bexley kitchen"
process_company_multi "Meritage Homes" "Onyx" "onyx kitchen"
process_company_multi "Tri Pointe Homes" "Whimbrel" "whimbrel kitchen"
process_company_multi "KB Home" "Painted Prairie" "painted prairie kitchen"
process_company_multi "Fulton Homes" "Rainier" "rainier kitchen"
process_company_multi "Ivory Homes" "Lexington" "lexington kitchen"
process_company_multi "Regency Homebuilders" "Magnolia" "magnolia kitchen"
process_company_multi "First Texas Homes" "Caroline" "caroline kitchen"
process_company_multi "Pacesetter Homes" "Almanor" "almanor kitchen"
process_company_multi "Rendition Homes" "Symphony" "symphony kitchen"
process_company_multi "GL Homes" "Carmel" "carmel kitchen"
process_company_multi "EdgeHomes" "Lauren" "lauren kitchen"
process_company_multi "Ball Homes" "Lowery" "lowery kitchen"
process_company_multi "Jagoe Homes" "Revolution" "revolution kitchen"
process_company_multi "Bill Clark Homes" "Murdock" "murdock kitchen"
process_company_multi "Van Metre Homes" "Taryn" "taryn kitchen"
process_company_multi "MainVue Homes" "Palmetto" "palmetto kitchen"
process_company_multi "Hakes Brothers" "Alameda" "alameda kitchen"
process_company_multi "Epcon Communities" "Portico" "portico kitchen"
process_company_multi "Lombardo Homes" "Charleston" "charleston kitchen"
process_company_multi "Landmark Homes" "Amberbrook" "amberbrook kitchen"

echo ""
echo "=== FINAL COUNT ==="
echo "Total leads in Instantly: $(wc -l < /tmp/c3-success.txt)"
