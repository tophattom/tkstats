<?php

class StatsDB extends SQLite3 {
  function __construct() {
    $this->open('../tkstats.db', SQLITE3_OPEN_READONLY);
  }
}

$gym_id = $_GET['gym_id'];
if (!isset($gym_id)) {
  die('No gym id');
}

$db = new StatsDB();

$stmt = $db->prepare("
select
  datetime(strftime('%s', timestamp) - strftime('%s', timestamp) % 1800, 'unixepoch') as time_chunk,
  min(count) as min,
  avg(count) as avg,
  max(count) as max
from visitor_counts
where
  gym_id = :gym_id and
  time_chunk >= datetime(strftime('%s', 'now', '-24 hours') - strftime('%s', 'now', '-24 hours') % 1800, 'unixepoch')
group by time_chunk;
");
$stmt->bindParam(':gym_id', $gym_id, SQLITE3_INTEGER);

$result = $stmt->execute();

$data = [];
while (($row = $result->fetchArray(SQLITE3_ASSOC))) {
  array_push($data, $row);
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
echo json_encode($data);

?>
