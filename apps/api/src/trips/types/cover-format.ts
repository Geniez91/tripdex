export enum ECoverFormat {
  Jpeg = 'jpg',
  Png = 'png',
  Webp = 'webp',
}

export interface ICoverFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}
