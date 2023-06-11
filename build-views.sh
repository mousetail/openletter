sleep 1 &&
echo "> mkdir -p build/public/javascripts" &&
mkdir -p build/public/javascripts &&
uglifyjs public/javascripts/application.js -c --source-map -o build/public/javascripts/application.js &&
uglifyjs public/javascripts/dark.js -c --source-map -o build/public/javascripts/dark.js &&
cp -r views build &&
cp -r public/stylesheets build/public &&
cp -r public/images build/public