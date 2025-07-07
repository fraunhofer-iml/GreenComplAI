<a id="readme-top"></a>

<br />
<div align="center">
<h2 align="center">GreenComplAI</h3>
  <p align="center">
    A NestJS/Angular-based application.
    <br />
    <a href="https://github.com/fraunhofer-iml/greencomplai/issues/new?labels=bug&template=bug-report---.md">🐞 Report Bug</a> &middot;
    <a href="https://github.com/fraunhofer-iml/greencomplai/issues/new?labels=enhancement&template=feature-request---.md">💡 Request Feature</a>
  </p>
</div>

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">📚 About The Project</a>
      <ul><li><a href="#description">📄 Description</a></li></ul>
      <ul><li><a href="#built-with">🛠️ Built With</a></li></ul>
      <ul><li><a href="#components-overview">🏗️ Components Overview</a></li></ul>
    </li>
    </li>
    <li><a href="#getting-started">🚀 Getting Started</a></li>
    <li>
      <a href="#contributing">🤝 Contributing</a>
      <ul><li><a href="#getting-involved">🌟 Getting Involved</a></li></ul>
    </li>
    <li><a href="#license">📜 License</a></li>
    <li><a href="#contact">📬 Contact</a></li>
    <li><a href="#acknowledgments">🙏 Acknowledgments</a></li>
  </ol>
</details>

## 📚 About The Project <a id="about-the-project"></a>

### 📄 Description <a id="description"></a>

GreenComplAI provides companies with an innovative digital solution that has
been specially designed to meet the challenges of sustainable supply chain
development. The web-based platform records sustainability data along the entire
value chain, automatically checks it for consistency using AI-supported
plausibility mechanisms and documents it in a tamper-proof manner. A central
dashboard provides real-time insights into key performance indicators - such as
resource flows or product-specific circularity data such as recycling rates. In
this way, GreenComplAI uncovers previously hidden sustainability potential in
supply chains and actively supports companies in their sustainable
transformation. The particular advantage: the data-based approach is flexible
and can be applied to the most diverse aspects of supply chain transparency. You
can find detailed [documentation](./documentation) in this repository.

### 🛠️ Built With <a id="built-with"></a>

- [![Angular][angular-shield]][angular-url] Framework for building dynamic web
  applications
- [![Docker][docker-shield]][docker-url] Platform for containerizing and
  deploying applications efficiently
- [![Jest][jest-shield]][jest-url] JavaScript testing framework
- [![Keycloak][keycloak-shield]][keycloak-url] Identity and access management
  solution
- [![NestJS][nestjs-shield]][nestjs-url] Node.js framework for building scalable
  server-side applications
- [![Nx][nx-shield]][nx-url] Build system for monorepos
- [![PostgreSQL][postgresql-shield]][postgresql-url] Relational database
  management system known for reliability and performance
- [![RabbitMQ][rabbitmq-shield]][rabbitmq-url] Message broker for distributed
  systems, supporting AMQP
- [![Prisma][prisma-shield]][prisma-url] ORM for database management
- [![ESLint][eslint-shield]][eslint-url] Utility for linting and enforcing code
  quality in JavaScript and TypeScript
- [![Prettier][prettier-shield]][prettier-url] Code formatter for consistent
  style
- [![Swagger][swagger-shield]][swagger-url] Tools for designing and documenting
  APIs
- [![TypeScript][typescript-shield]][typescript-url] Strongly typed programming
  language that enhances JavaScript

### 🏗️ Components Overview <a id="components-overview"></a>

The project consists of the following components:

1. **Backend for frontend (`bff`)**

- Exposes endpoints for the frontend application.
- Handles all incoming HTTP requests and routes them to the appropriate services
  via AMQP.
- Takes care of the preparation of the data for the Angular frontend.

2. **entity-management-service (`entity-management-svc`)**

- Manages all entities such as companies and products.

4. **Frontend (`frontend`)**

- Allows users to place orders.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## 🚀 Getting Started <a id="getting-started"></a>

To set up and run GreenComplAI locally, please consult the chapters
[Deployment View](https://github.com/fraunhofer-iml/greencomplai/blob/main/documentation/07-deployment-view.adoc)
and
[Tutorial](https://github.com/fraunhofer-iml/greencomplai/blob/main/documentation/12-tutorial.adoc)
in our documentation. These two chapters provide step-by-step instructions to
guide you through the process of installing, configuring and running SIMBA on
your local machine.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## 🤝 Contributing <a id="contributing"></a>

### 🌟 Getting Involved <a id="getting-involved"></a>

Contributions are what make the open source community such an amazing place to
learn, inspire, and create. Any contributions you make are **greatly
appreciated**.

If you have a suggestion that would make this better, please fork the repo and
create a pull request. You can also simply open an issue with the tag
"enhancement".

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/amazing-feature`)
3. Commit your Changes (`git commit -m 'Add some amazing-feature'`)
4. Push to the Branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## 📜 License <a id="license"></a>

Licensed under the Apache License 2.0. See `LICENSE` for details.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## 📬 Contact <a id="contact"></a>

Matthias Schönborn: matthias.schoenborn@iml.fraunhofer.de

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## 🙏 Acknowledgments <a id="acknowledgments"></a>

- [Best-README-Template](https://github.com/othneildrew/Best-README-Template)
  provided inspiration and structure for creating this README file
- [Img Shields](https://shields.io) enabled the creation of customizable and
  visually appealing badges for this project, which is included unmodified in
  this readme file under the terms of the
  [CC0 1.0 Universal](https://github.com/badges/shields/blob/master/LICENSE)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[angular-shield]:
  https://img.shields.io/badge/Framework-Angular-DD0031?style=flat&logo=angular
[angular-url]: https://angular.io/
[docker-shield]:
  https://img.shields.io/badge/Platform-Docker-2496ED?style=flat&logo=docker
[docker-url]: https://www.docker.com/
[eslint-shield]:
  https://img.shields.io/badge/Linting-ESLint-4B32C3?style=flat&logo=eslint
[eslint-url]: https://eslint.org/
[hyperledgerbesu-shield]:
  https://img.shields.io/badge/Blockchain-Hyperledger%20Besu-F26822?style=flat&logo=ethereum
[hyperledgerbesu-url]: https://besu.hyperledger.org/
[jest-shield]:
  https://img.shields.io/badge/Testing-Jest-C21325?style=flat&logo=jest
[jest-url]: https://jestjs.io/
[keycloak-shield]:
  https://img.shields.io/badge/Library-Keycloak-DC382D?style=flat&logo=keycloak
[keycloak-url]: https://www.keycloak.org/
[minio-shield]:
  https://img.shields.io/badge/Storage-MinIO-FF6F00?style=flat&logo=minio
[minio-url]: https://min.io/
[nestjs-shield]:
  https://img.shields.io/badge/Framework-NestJS-E0234E?style=flat&logo=nestjs
[nestjs-url]: https://nestjs.com/
[nftfolderblockchainconnector-shield]:
  https://img.shields.io/badge/Library-Blockchain_Connector-F7931A?style=flat&logo=ethereum
[nftfolderblockchainconnector-url]:
  https://github.com/fraunhofer-iml/nft-folder-blockchain-connector
[nftfoldersmartcontracts-shield]:
  https://img.shields.io/badge/Smart_Contracts-Tokenization_Smart_Contracts-F7931A?style=flat&logo=ethereum
[nftfoldersmartcontracts-url]:
  https://github.com/fraunhofer-iml/nft-folder-smart-contracts
[nx-shield]: https://img.shields.io/badge/Tool-Nx-DD0031?style=flat&logo=nrwl
[nx-url]: https://nx.dev/
[postgresql-shield]:
  https://img.shields.io/badge/Database-PostgreSQL-336791?style=flat&logo=postgresql
[postgresql-url]: https://www.postgresql.org/
[prettier-shield]:
  https://img.shields.io/badge/Formatting-Prettier-F7B93E?style=flat&logo=prettier
[prettier-url]: https://prettier.io/
[prisma-shield]:
  https://img.shields.io/badge/ORM-Prisma-2D3748?style=flat&logo=prisma
[prisma-url]: https://www.prisma.io/
[rabbitmq-shield]:
  https://img.shields.io/badge/Message_Broker-RabbitMQ-FF6600?style=flat&logo=rabbitmq
[rabbitmq-url]: https://www.rabbitmq.com/
[rxjs-shield]:
  https://img.shields.io/badge/Library-RxJS-B7178C?style=flat&logo=reactivex
[rxjs-url]: https://rxjs.dev/
[swagger-shield]:
  https://img.shields.io/badge/API-Swagger-85EA2D?style=flat&logo=swagger
[swagger-url]: https://swagger.io/
[tailwindcss-shield]:
  https://img.shields.io/badge/CSS_Framework-TailwindCSS-06B6D4?style=flat&logo=tailwindcss
[tailwindcss-url]: https://tailwindcss.com/
[typescript-shield]:
  https://img.shields.io/badge/Language-TypeScript-007ACC?style=flat&logo=typescript
[typescript-url]: https://www.typescriptlang.org/
