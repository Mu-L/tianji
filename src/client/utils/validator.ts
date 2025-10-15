import { RuleObject } from 'antd/es/form';
import { z } from 'zod';
import { hostnameRegex, slugRegex, domainRegex } from '@tianji/shared';

type Validator = (
  rule: RuleObject,
  value: any,
  callback: (error?: string) => void
) => Promise<void | any> | void;

export const hostnameValidator: Validator = (rule, value, callback) => {
  try {
    z.union([z.ipv4(), z.ipv6(), z.string().regex(hostnameRegex)]).parse(value);
    callback();
  } catch (err) {
    callback('Not valid host, it should be ip or hostname');
  }
};

export const domainValidator: Validator = (rule, value, callback) => {
  try {
    if (!rule.required && !value) {
      callback();
      return;
    }

    z.string().regex(domainRegex).parse(value);
    callback();
  } catch (err) {
    callback('Not valid, it should be domain, for example: example.com');
  }
};

export const urlSlugValidator: Validator = (rule, value, callback) => {
  try {
    z.string().regex(slugRegex).parse(value);
    callback();
  } catch (err) {
    callback('Not valid slug');
  }
};

export const portValidator: Validator = (rule, value, callback) => {
  try {
    z.number().min(1).max(65535).parse(value);
    callback();
  } catch (err) {
    callback('Not valid port, it should be 1 ~ 65535');
  }
};
