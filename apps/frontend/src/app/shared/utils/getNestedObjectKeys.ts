/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export function getNestedObjectKeys(obj: any, previousPath = ''): string[] {
  let objectKeys: string[] = [];
  Object.keys(obj).forEach((key: any) => {
    if (typeof obj[key] !== 'object') {
      objectKeys.push(previousPath ? `${previousPath}.${key}` : key);
    } else if (Array.isArray(obj[key])) {
      if (obj[key].length > 0) {
        objectKeys = objectKeys.concat(
          getNestedObjectKeys(
            obj[key][0],
            previousPath ? `${previousPath}.${key}` : key
          )
        );
      } else objectKeys.push(key);
    } else {
      objectKeys = objectKeys.concat(
        getNestedObjectKeys(
          obj[key],
          previousPath ? `${previousPath}.${key}` : key
        )
      );
    }
  });
  return objectKeys;
}

export function toNestedObject<T>(path: string, value: any, obj?: T): T {
  const keys = path.split('.');
  const retVal: T = obj || ({} as T);
  const key = keys.shift();
  if (key) {
    if ((retVal as any)[key] !== undefined && keys.length < 1) {
      (retVal as any)[key] = Array.isArray((retVal as any)[key])
        ? [...(retVal as any)[key], value]
        : [(retVal as any)[key], value];
    } else if (keys.length >= 1) {
      (retVal as any)[key] = toNestedObject<T>(
        keys.join('.'),
        value,
        (retVal as any)[key]
      );
    } else {
      (retVal as any)[key] = value || { value };
    }
  }
  return retVal;
}
