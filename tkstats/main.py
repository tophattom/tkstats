from datetime import timedelta
import json
import os
import sqlite3
import warnings

from flask import abort, Flask, request, Response
import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing

warnings.filterwarnings('ignore')

DATABASE_FILE = os.environ.get('DATABASE_FILE')

FORECAST_TIME_STEP = 3600
FORECAST_SEASON_LENGTH = 168
FORECAST_TRAIN_PERIOD_HOURS = FORECAST_SEASON_LENGTH * 3


class StatsDb:
    def __init__(self):
        self.database_file = os.environ.get('DATABASE_FILE')
        self.conn = sqlite3.connect(self.database_file)
        self.conn.row_factory = sqlite3.Row

    @classmethod
    def gym_data_query(cls):
        return '''
            SELECT
              datetime(strftime('%s', timestamp) - strftime('%s', timestamp) % :timestep, 'unixepoch') AS time_chunk,
              max(count) AS max
            FROM visitor_counts
            WHERE
              gym_id = :gym_id and
              time_chunk >= datetime(strftime('%s', 'now', :period) - strftime('%s', 'now', :period) % :timestep, 'unixepoch')
            GROUP BY time_chunk;
        '''

    def get_gym_data(self, gym_id, time_step=1800, period_hours=24):
        result = self.conn.execute(
            self.gym_data_query(),
            {
                'timestep': time_step,
                'gym_id': gym_id,
                'period': self.sql_period(period_hours)
            }
        ).fetchall()

        return [dict(row) for row in result]

    def sql_period(self, hours):
        return '-{} hours'.format(hours)


app = Flask(__name__)


@app.route('/gym/<int:gym_id>', methods=['GET'])
def api(gym_id):
    time_step = request.args.get('time_step', 3600)
    period_hours = request.args.get('period', 24)

    stats_db = StatsDb()
    result = stats_db.get_gym_data(gym_id, time_step=time_step, period_hours=period_hours)

    return Response(json.dumps({'data': result}), mimetype='application/json')


@app.route('/gym/<int:gym_id>/forecast', methods=['GET'])
def forecast(gym_id):
    period_hours = int(request.args.get('period', 6))

    stats_db = StatsDb()
    df = pd.read_sql_query(
        stats_db.gym_data_query(),
        stats_db.conn,
        parse_dates={'time_chunk': '%Y-%m-%d %H:%M:%S'},
        index_col=['time_chunk'],
        params={
            'gym_id': gym_id,
            'timestep': FORECAST_TIME_STEP,
            'period': stats_db.sql_period(FORECAST_TRAIN_PERIOD_HOURS),
        }
    )
    df.index.freq = 'H'

    model = ExponentialSmoothing(df, seasonal='add', seasonal_periods=FORECAST_SEASON_LENGTH).fit()
    pred = model.predict(start=df.index[-1], end=df.index[-1] + timedelta(hours=period_hours))

    result = []
    for time_chunk, max_value in pred.items():
        result.append({
            'time_chunk': time_chunk.isoformat(),
            'max': max(0, int(max_value)),
        })

    return Response(json.dumps({'data': result}), mimetype='application/json')
