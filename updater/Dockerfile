FROM ubuntu:latest

RUN apt-get update && apt-get -y install cron curl sqlite3 html2text

COPY update.sh /script/update.sh
COPY cron/fetch-stats /etc/cron.d/fetch-stats

RUN crontab /etc/cron.d/fetch-stats

RUN touch /var/log/cron.log

CMD cron && tail -f /var/log/cron.log
