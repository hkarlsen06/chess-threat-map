#!/bin/sh
# Builds the Safari app wrapper and installs it to ~/Applications. Needs Xcode and an Apple Development certificate.
# Then enable "Chess Threat Map" in Safari > Settings > Extensions.
set -e
cd "$(dirname "$0")"
TEAM=${TEAM:-$(security find-certificate -c "Apple Development" -p | openssl x509 -noout -subject | sed -n 's/.*OU=\([^,]*\).*/\1/p')}
BUNDLE_ID=${BUNDLE_ID:-com.$(id -un | tr -cd 'a-zA-Z0-9').Chess-Threat-Map}
out=$(mktemp -d)
xcrun safari-web-extension-converter extension --project-location "$out" --app-name "Chess Threat Map" \
  --bundle-identifier "$BUNDLE_ID" --macos-only --swift --copy-resources --no-open --no-prompt --force >/dev/null
cd "$out/Chess Threat Map"
xcodebuild -scheme "Chess Threat Map" -configuration Release -derivedDataPath build -quiet \
  DEVELOPMENT_TEAM="$TEAM" CODE_SIGN_STYLE=Automatic -allowProvisioningUpdates build
mkdir -p ~/Applications
rm -rf ~/Applications/"Chess Threat Map.app"
cp -R "build/Build/Products/Release/Chess Threat Map.app" ~/Applications/
rm -rf "$out"
open ~/Applications/"Chess Threat Map.app" # first launch registers the extension with Safari
echo "Installed. Enable it in Safari > Settings > Extensions."
