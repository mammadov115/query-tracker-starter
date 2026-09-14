# Query Tracker Spring Boot Starter

Zero-config SQL query tracker for Spring Boot. Displays all DB queries per HTTP request with timing, N+1 detection, and duplicate detection.

## Add to your project

### 1. Install the starter into local Maven repo

Run this in the query-tracker-starter directory:

    cd query-tracker-starter
    mvn clean install

### 2. Add dependency to your project pom.xml

    <dependency>
        <groupId>com.devtools</groupId>
        <artifactId>query-tracker-starter</artifactId>
        <version>1.0.0</version>
    </dependency>

### 3. Add P6Spy dependency if not already present

    <dependency>
        <groupId>com.github.gavlyukovskiy</groupId>
        <artifactId>p6spy-spring-boot-starter</artifactId>
        <version>1.9.2</version>
    </dependency>

### 4. Enable P6Spy in application.yml

    decorator:
      datasource:
        p6spy:
          enable-logging: true

### 5. Open the dashboard

Run your app and visit:

    http://localhost:8080/query-tracker

## What it shows

- All HTTP requests with query count, duration, and issue flags
- Per-request SQL query list with execution time
- N+1 detection (same query repeated 3+ times in one request)
- Duplicate SQL detection
- Copy button: copies URL, datetime, and all queries with timings

## How it works

- P6SpyQueryListener is registered as a Spring bean and picked up automatically by datasource-decorator
- RequestTraceFilter collects queries from ThreadLocal per HTTP request
- Traces are stored in memory (last 200 requests)
- Dashboard is served as static HTML at /query-tracker
