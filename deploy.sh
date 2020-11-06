echo What should the version be?
read VERSION


docker build -t preeternal/lireddit:$VERSION
docker push preeternal/lireddit:$VERSION