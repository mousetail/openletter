echo "> tsc -t es5 --lib es7 --outDir build --esModuleInterop ./*.ts" &&
node-sass public/stylesheets --output build/public/stylesheets &&
tsc -t es5 --lib es7 --outDir build --esModuleInterop ./*.ts &&
echo "> mkdir -p build/public/javascripts" &&
mkdir -p build/public/javascripts &&
echo "> uglifyjs public/javascripts/*.js -c --source-map -o build/public/javascripts/application.js" &&
uglifyjs public/javascripts/*.js -c --source-map -o build/public/javascripts/application.js &&
echo "> cp -r public/stylesheets build/public" &&
cp -r public/stylesheets build/public &&
cp public/icon.png build/public/icon.png &&
echo "> cp -r views build" &&
cp -r views build