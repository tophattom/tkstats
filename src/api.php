<?php

require_once('inc/statsdb.php');

$gym_id = $_GET['gym_id'];
if (!isset($gym_id)) {
  die('No gym id');
}

$time_step = $_GET['time_step'] ?? 1800;
$period_hours = $_GET['period'] ?? 24;

$db = new StatsDB();
$result = $db->getGymData($gym_id, $time_step, $period_hours);

$data = [];
while (($row = $result->fetchArray(SQLITE3_ASSOC))) {
  array_push($data, $row);
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
echo json_encode($data);

?>
