# Stage 1: Build the application
FROM eclipse-temurin:17-jdk-jammy AS build
WORKDIR /app

# Copy the specific api folder contents into the container workdir
COPY api/agritech-finance-api/ .

<<<<<<< HEAD
RUN ./mvnw clean package -DskipTests
=======
RUN chmod +x mvnw && ./mvnw clean package -DskipTests
>>>>>>> acbe4f2b84647d82b76b7be89e6f4dd255d1c596

# Stage 2: Run the application
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080
<<<<<<< HEAD
ENTRYPOINT ["java", "-jar", "app.jar"]
=======
ENTRYPOINT ["java", "-jar", "app.jar"]
>>>>>>> acbe4f2b84647d82b76b7be89e6f4dd255d1c596
