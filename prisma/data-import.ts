/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Entity {
  name: string;
  records: any[];
  createRecord: (record: any) => Promise<any>;
}

async function importEntities(entities: Entity[]) {
  for (const entity of entities) {
    console.log(`### Import of '${entity.name}' started ####`);

    let counter = 0;

    for (const record of entity.records) {
      await entity.createRecord(record);
      counter++;
    }

    console.log(`### Import of '${counter} ${entity.name}' finished ###\n`);
  }
}

export { Entity, importEntities };
