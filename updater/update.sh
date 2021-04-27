#!/bin/bash

STATS_DB=$1
BASE_URL="https://tk.boulderkeskus.com/t/paritus/show_climbers_in/?location="

NEKALA_EXTERNAL_ID=1
NEKALA_DB_ID=1

LIELAHTI_EXTERNAL_ID=2
LIELAHTI_DB_ID=2

fetchCount() {
  local URL="${BASE_URL}$1"
  local COUNT=$(curl --silent $URL | html2text)

  sqlite3 $STATS_DB "INSERT INTO visitor_counts(count, gym_id) VALUES ($COUNT, $2);"
}

fetchCount $NEKALA_EXTERNAL_ID $NEKALA_DB_ID
fetchCount $LIELAHTI_EXTERNAL_ID $LIELAHTI_DB_ID
