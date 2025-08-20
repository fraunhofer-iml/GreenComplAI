FROM eclipse-temurin:21.0.5_11-jre-alpine

WORKDIR /app
COPY target/DPP_BaSyx_SKALA-0.0.1-SNAPSHOT.jar /app/app.jar
HEALTHCHECK --interval=10s --timeout=5s --retries=30 CMD wget --spider -q http://localhost:${SERVER_PORT:-8080}/description || exit 1

ENTRYPOINT ["java", "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005", "-jar", "app.jar"]
