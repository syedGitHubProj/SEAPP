# SellEase API image. Built by the deploy workflow; runs behind Caddy on the server.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY global.json SellEase.slnx ./
COPY src/SellEase.Api/SellEase.Api.csproj src/SellEase.Api/
RUN dotnet restore src/SellEase.Api/SellEase.Api.csproj
COPY src/ src/
RUN dotnet publish src/SellEase.Api -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
# Folders the app writes to (kept in Docker volumes): sign-in cookie keys, and photos if not using Spaces.
RUN mkdir -p /keys /photos && chown "$APP_UID" /keys /photos
ENV ASPNETCORE_HTTP_PORTS=8080 \
    DataProtection__KeysPath=/keys \
    Photos__LocalPath=/photos
USER $APP_UID
EXPOSE 8080
# With no arguments it runs the web API; with "migrate", "load-demo", "wipe-staging" or
# "create-admin USER NAME" it runs that one-off task and stops.
ENTRYPOINT ["dotnet", "SellEase.Api.dll"]
