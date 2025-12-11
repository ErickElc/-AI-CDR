FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["AI-CDR.Backend.Api/AI-CDR.Backend.Api.csproj", "AI-CDR.Backend.Api/"]
RUN dotnet restore "AI-CDR.Backend.Api/AI-CDR.Backend.Api.csproj"
COPY . .
WORKDIR "/src/AI-CDR.Backend.Api"
RUN dotnet build "AI-CDR.Backend.Api.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "AI-CDR.Backend.Api.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app

# Instalar curl para healthcheck
RUN apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*

COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "AI-CDR.Backend.Api.dll"]

