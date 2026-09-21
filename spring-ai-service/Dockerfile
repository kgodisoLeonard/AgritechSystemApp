FROM maven:3.9-eclipse-temurin-8 AS build

WORKDIR /workspace
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B package -DskipTests

FROM eclipse-temurin:8-jre
WORKDIR /app
COPY --from=build /workspace/target/spring-ai-service-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
