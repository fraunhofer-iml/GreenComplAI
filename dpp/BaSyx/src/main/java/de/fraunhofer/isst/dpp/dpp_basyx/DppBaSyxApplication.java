package de.fraunhofer.isst.dpp.dpp_basyx;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = {"org.eclipse.digitaltwin.basyx", "de.fraunhofer.isst.dpp"})
public class DppBaSyxApplication {

    public static void main(String[] args) {
        SpringApplication.run(DppBaSyxApplication.class, args);
    }

}
