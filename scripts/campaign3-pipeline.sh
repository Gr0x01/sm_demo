#!/bin/bash
# Campaign 3 Pipeline: Apollo → Instantly → Notion
# For each company: find best contact, get verified email, add to Instantly

set -euo pipefail

APOLLO_KEY=$(grep APOLLO_API_KEY /Users/rb/Documents/coding_projects/sm_demo/.env.local | cut -d= -f2)
INSTANTLY_KEY=$(grep INSTANTLY_API_KEY /Users/rb/Documents/coding_projects/sm_demo/.env.local | cut -d= -f2)
CAMPAIGN_ID="7126cdf0-b493-4207-b97e-69710820ca07"

# Title hierarchy for Apollo search (best → worst)
TITLES='["Digital Sales Manager","Digital Marketing Manager","Online Sales Manager","VP Sales","Vice President of Sales","Director of Sales","VP Sales and Marketing","Vice President Sales and Marketing","Design Center Manager","Design Center Director","Design Studio Manager","Director of Marketing","VP Marketing","Vice President of Marketing"]'

process_company() {
  local company_name="$1"
  local domain="$2"
  local floorplan="$3"
  local subject="$4"

  echo "=== Processing: $company_name ==="

  # Step 1: Search Apollo for best contact
  local search_result=$(curl -s -X POST "https://api.apollo.io/api/v1/mixed_people/api_search" \
    -H "Content-Type: application/json" \
    -H "X-Api-Key: $APOLLO_KEY" \
    -d "{
      \"q_organization_name\": \"$company_name\",
      \"person_titles\": $TITLES,
      \"per_page\": 3,
      \"page\": 1
    }")

  local total=$(echo "$search_result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total_entries',0))" 2>/dev/null)

  if [ "$total" = "0" ]; then
    echo "  NO CONTACTS FOUND - skipping"
    echo "$company_name|NO_CONTACT|||$floorplan|$subject" >> /tmp/c3-skipped.txt
    return
  fi

  # Get the best match (first result = highest priority title)
  local person_id=$(echo "$search_result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['people'][0]['id'])" 2>/dev/null)
  local first_name=$(echo "$search_result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['people'][0].get('first_name',''))" 2>/dev/null)
  local title=$(echo "$search_result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['people'][0].get('title',''))" 2>/dev/null)
  local last_obf=$(echo "$search_result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['people'][0].get('last_name_obfuscated',''))" 2>/dev/null)

  echo "  Found: $first_name $last_obf | $title"

  # Step 2: Reveal contact via Apollo
  local reveal_result=$(curl -s -X POST "https://api.apollo.io/api/v1/people/bulk_match" \
    -H "Content-Type: application/json" \
    -H "X-Api-Key: $APOLLO_KEY" \
    -d "{
      \"details\": [{\"id\": \"$person_id\"}],
      \"reveal_personal_emails\": true
    }")

  local full_name=$(echo "$reveal_result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['matches'][0].get('name',''))" 2>/dev/null)
  local last_name=$(echo "$reveal_result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['matches'][0].get('last_name',''))" 2>/dev/null)
  local email=$(echo "$reveal_result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['matches'][0].get('email','') or '')" 2>/dev/null)
  local linkedin=$(echo "$reveal_result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['matches'][0].get('linkedin_url','') or '')" 2>/dev/null)

  if [ -z "$email" ] || [ "$email" = "None" ] || [ "$email" = "" ]; then
    echo "  NO EMAIL for $full_name - skipping"
    echo "$company_name|NO_EMAIL|$full_name|$title|$floorplan|$subject" >> /tmp/c3-skipped.txt
    return
  fi

  echo "  Revealed: $full_name | $title | $email"

  # Step 3: Add to Instantly
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

  if [ "$lead_id" = "FAILED" ]; then
    echo "  INSTANTLY FAILED: $add_result"
    echo "$company_name|INSTANTLY_FAIL|$full_name|$email|$floorplan|$subject" >> /tmp/c3-skipped.txt
  else
    echo "  Added to Instantly: $lead_id"
    echo "$company_name|$full_name|$title|$email|$linkedin|$floorplan|$subject" >> /tmp/c3-success.txt
  fi

  # Small delay to avoid rate limits
  sleep 1
}

# Clear output files
> /tmp/c3-success.txt
> /tmp/c3-skipped.txt

echo "Starting C3 Pipeline - $(date)"
echo "Campaign ID: $CAMPAIGN_ID"
echo ""

# Company list: name|domain|floorplan|subject
# Tier 1
process_company "Bloomfield Homes" "bloomfieldhomes.com" "Bellflower" "bellflower kitchen"
process_company "Adams Homes" "adamshomes.com" "Town Creek Trails" "town creek trails kitchen"
process_company "LGI Homes" "lgihomes.com" "Driftwood" "driftwood kitchen"
process_company "Sitterle Homes" "sitterlehomes.com" "Dijon" "dijon kitchen"
process_company "Saratoga Homes" "saratogahomestexas.com" "Bellagio" "bellagio kitchen"
process_company "Homes by Taber" "homesbytaber.com" "Shiloh" "shiloh kitchen"
process_company "Allen Edwin Homes" "allenedwin.com" "Elements 2700" "elements 2700 kitchen"
process_company "Hayden Homes" "hayden-homes.com" "Harrison" "harrison kitchen"
process_company "Keystone Custom Homes" "keystonecustomhome.com" "Augusta" "augusta kitchen"
process_company "GHO Homes" "ghohomes.com" "Venetian" "venetian kitchen"

# Tier 2 - Southeast
process_company "Goodwyn Building" "goodwynbuilding.com" "Brittany" "brittany kitchen"
process_company "Alexander Scott Homes" "alexanderscotthomes.com" "Bradford" "bradford kitchen"
process_company "Trademark Quality Homes" "trademarkqualityhomes.com" "Pendleton" "pendleton kitchen"
process_company "Harris Doyle Homes" "harrisdoyle.com" "Franklin" "franklin kitchen"
process_company "Kerley Family Homes" "kerleyfamilyhomes.com" "Washington" "washington kitchen"
process_company "Silverstone Communities" "silverstonecommunities.com" "Danbury" "danbury kitchen"
process_company "Paran Homes" "paranhomes.com" "Piedmont" "piedmont kitchen"
process_company "TBG Homes" "tbghomes.com" "Athena" "athena kitchen"
process_company "Valor Communities" "valorcommunities.com" "Rosemary III" "rosemary III kitchen"
process_company "Woodland Homes" "woodlandhomesal.com" "Brookshire Grand" "brookshire grand kitchen"

# Tier 2 - National
process_company "Dream Finders Homes" "dreamfindershomes.com" "Avalon" "avalon kitchen"
process_company "David Weekley Homes" "davidweekleyhomes.com" "Baileywood" "baileywood kitchen"
process_company "Eastwood Homes" "eastwoodhomes.com" "Charleston" "charleston kitchen"
process_company "Stanley Martin Homes" "stanleymartin.com" "Sutton" "sutton kitchen"
process_company "Neal Communities" "nealcommunities.com" "Captiva" "captiva kitchen"
process_company "Ashton Woods Homes" "ashtonwoods.com" "Scarlet" "scarlet kitchen"
process_company "Smith Douglas Homes" "smithdouglas.com" "Caldwell" "caldwell kitchen"
process_company "Classic Homes" "classichomes.com" "Monarch" "monarch kitchen"
process_company "New Tradition Homes" "newtraditionhomes.com" "Laurelhurst" "laurelhurst kitchen"
process_company "CBH Homes" "cbhhomes.com" "Capri" "capri kitchen"
process_company "Challenger Homes" "challengerhomes.com" "Charleston" "charleston kitchen"
process_company "Pahlisch Homes" "pahlischhomes.com" "Bentley" "bentley kitchen"

# Tier 2 - Texas
process_company "Highland Homes" "highlandhomes.com" "Wildflower Ranch" "wildflower ranch kitchen"
process_company "Dunhill Homes" "dunhillhomes.com" "Madelyn" "madelyn kitchen"
process_company "Scott Felder Homes" "scottfelderhomes.com" "Travis" "travis kitchen"
process_company "Westin Homes" "westinhomes.com" "Jaxson" "jaxson kitchen"
process_company "Shaddock Homes" "shaddockhomes.com" "Albany" "albany kitchen"

# Tier 2 - NC/TN
process_company "True Homes" "truehomes.com" "Lenox" "lenox kitchen"
process_company "McKee Homes" "mckeehomes.com" "Promenade" "promenade kitchen"
process_company "Homes by Dickerson" "homesbydickerson.com" "Jubilee House" "jubilee house kitchen"
process_company "Logan Homes" "loganhomesinc.com" "Alder" "alder kitchen"
process_company "Ole South Properties" "olesouth.com" "Park Place" "park place kitchen"
process_company "Celebration Homes" "celebrationhomestn.com" "Hadley" "hadley kitchen"

# Tier 2 - Florida
process_company "Holiday Builders" "holidaybuilders.com" "Sanibel" "sanibel kitchen"
process_company "Christopher Alan Homes" "christopheralanhomes.com" "Captiva" "captiva kitchen"
process_company "Highland Homes FL" "highlandhomes.org" "Shelby" "shelby kitchen"
process_company "Park Square Homes" "parksquarehomes.com" "Hampton II" "hampton II kitchen"

# Tier 2 - Other
process_company "Maronda Homes" "marondahomes.com" "Somerset" "somerset kitchen"
process_company "Miramonte Homes" "miramontehomes.com" "Aries" "aries kitchen"
process_company "Main Street Homes" "gomsh.com" "Monterey" "monterey kitchen"
process_company "Craftmark Homes" "craftmarkhomes.com" "Strathmore" "strathmore kitchen"
process_company "Fischer Homes" "fischerhomes.com" "DaVinci" "davinci kitchen"
process_company "Rockford Homes" "rockfordhomes.com" "Taylor" "taylor kitchen"
process_company "Schumacher Homes" "schumacherhomes.com" "Charleston" "charleston kitchen"
process_company "Davis Building Group" "davishomes.com" "Lancaster" "lancaster kitchen"
process_company "Wayne Homes" "waynehomes.com" "Chesapeake" "chesapeake kitchen"
process_company "Chesapeake Homes" "cheshomes.com" "Iris" "iris kitchen"
process_company "Caldwell Homes" "caldwellcos.com" "Cardinal" "cardinal kitchen"
process_company "Drees Homes" "dreeshomes.com" "Grayford" "grayford kitchen"

# Tier 3
process_company "M/I Homes" "mihomes.com" "Nolan" "nolan kitchen"
process_company "Mattamy Homes" "mattamyhomes.com" "Bexley" "bexley kitchen"
process_company "Meritage Homes" "meritagehomes.com" "Onyx" "onyx kitchen"
process_company "Tri Pointe Homes" "tripointehomes.com" "Whimbrel" "whimbrel kitchen"
process_company "KB Home" "kbhome.com" "Painted Prairie" "painted prairie kitchen"
process_company "Fulton Homes" "fultonhomes.com" "Rainier" "rainier kitchen"
process_company "Ivory Homes" "ivoryhomes.com" "Lexington" "lexington kitchen"
process_company "Regency Homebuilders" "regencyhomebuilders.com" "Magnolia" "magnolia kitchen"

# Tier 4
process_company "First Texas Homes" "firsttexashomes.com" "Caroline" "caroline kitchen"
process_company "Pacesetter Homes" "pacesetterhomestexas.com" "Almanor" "almanor kitchen"
process_company "Rendition Homes" "renditionhomes.com" "Symphony" "symphony kitchen"
process_company "GL Homes" "glhomes.com" "Carmel" "carmel kitchen"
process_company "EdgeHomes" "edgehomes.com" "Lauren" "lauren kitchen"
process_company "Ball Homes" "ballhomes.com" "Lowery" "lowery kitchen"
process_company "Jagoe Homes" "jagoehomes.com" "Revolution" "revolution kitchen"
process_company "Bill Clark Homes" "billclarkhomes.com" "Murdock" "murdock kitchen"
process_company "Van Metre Homes" "vanmetrehomes.com" "Taryn" "taryn kitchen"
process_company "MainVue Homes" "mainvuehomes.com" "Palmetto" "palmetto kitchen"
process_company "Hakes Brothers" "hakesbrothers.com" "Alameda" "alameda kitchen"
process_company "Epcon Communities" "epconcommunities.com" "Portico" "portico kitchen"
process_company "Lombardo Homes" "lombardohomes.com" "Charleston" "charleston kitchen"
process_company "Landmark Homes" "landmarkbuilds.com" "Amberbrook" "amberbrook kitchen"

echo ""
echo "=== DONE ==="
echo "Successes: $(wc -l < /tmp/c3-success.txt)"
echo "Skipped: $(wc -l < /tmp/c3-skipped.txt)"
echo ""
echo "Success details:"
cat /tmp/c3-success.txt
echo ""
echo "Skipped details:"
cat /tmp/c3-skipped.txt
