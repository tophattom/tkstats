FROM python:3.8

ENV PYTHONDONTWRITEBYTECODE=1 \
  PYTHONUNBUFFERED=1

# Install Poetry
RUN curl -sSL https://raw.githubusercontent.com/python-poetry/poetry/master/get-poetry.py | python
ENV PATH="${PATH}:/root/.poetry/bin"

WORKDIR /app

# Install dependencies
COPY pyproject.toml poetry.lock /app/
RUN poetry config virtualenvs.create false \
  && poetry install --no-dev --no-interaction --no-ansi

COPY . /app

EXPOSE 3031
CMD ["poetry", "run", "uwsgi", "--manage-script-name", "--socket", "0.0.0.0:3031", "--plugins", "python3", "--protocol", "uwsgi", "--mount", "/api=tkstats:app"]
