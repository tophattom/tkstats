<?php

class StatsDB extends SQLite3 {
  function __construct() {
    $this->open('../tkstats.db', SQLITE3_OPEN_READONLY);
  }

  function getGymData($gym_id, $time_step = 1800, $period_hours = 24) {
    $period = '-' . $period_hours . ' hours';
    $stmt = $this->prepare("
    select
      datetime(strftime('%s', timestamp) - strftime('%s', timestamp) % :time_step, 'unixepoch') as time_chunk,
      min(count) as min,
      avg(count) as avg,
      max(count) as max
    from visitor_counts
    where
      gym_id = :gym_id and
      time_chunk >= datetime(strftime('%s', 'now', :period) - strftime('%s', 'now', :period) % :time_step, 'unixepoch')
    group by time_chunk;
    ");
    $stmt->bindParam(':gym_id', $gym_id, SQLITE3_INTEGER);
    $stmt->bindParam(':time_step', $time_step, SQLITE3_INTEGER);
    $stmt->bindParam(':period', $period, SQLITE3_TEXT);

    return $stmt->execute();
  }
}

?>
