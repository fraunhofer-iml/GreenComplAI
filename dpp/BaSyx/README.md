## DPP BaSyx

This is a simple Spring Boot based project, that is importing the AAS repository and Submodel repository modules from 
the BaSyx project. 

### Run it in IntelliJ
You should be able to run it in IntelliJ normally. Since the default setting in the application.properties is set 
to "InMemory", it is not necessary to have a MongoDB server running. If you want to test on another port than the 
default (8080), then also see the application.properties file.  


### Create .jar
```
./mvnw clean package -DskipTests
```

### Create a Docker Image
Note: the Dockerfile that is provided here assumes, that you previously created a .jar file (see above). 

For the sake of simplicity, you can use the 'builddockerimage.sh' script. It will automatically create a new .jar file 
from the current state of the source code and then run a 'docker build' command. The generated docker image will be 
named 'dpp_basyx:latest'. 



