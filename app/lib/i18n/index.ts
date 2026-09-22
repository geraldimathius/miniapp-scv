import id from './dictionaries/id.json';
import en from './dictionaries/en.json';

export type Locale = 'id' | 'en';
export type Dictionary = typeof id;

const dictionaries = {
  id,
  en,
};

export const getDictionary = (locale: string): Dictionary => {
  return dictionaries[locale as Locale] || dictionaries['id'];
};
