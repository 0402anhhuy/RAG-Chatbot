FROM maven:3.9.9-eclipse-temurin-21 AS build

WORKDIR /build
COPY backend/pom.xml backend/pom.xml
WORKDIR /build/backend
RUN mvn -q -DskipTests dependency:go-offline
COPY backend/src src
RUN mvn -q -DskipTests package

FROM eclipse-temurin:21-jre

WORKDIR /app
COPY --from=build /build/backend/target/knowledge-hub-backend-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
