declare module 'wordcloud' {
  interface WordCloudOptions {
    list: [string, number][];
    gridSize?: number;
    weightFactor?: number;
    fontFamily?: string;
    color?: string | ((word: string) => string);
    backgroundColor?: string;
    rotateRatio?: number;
    minSize?: number;
    maxSpeed?: number;
  }
  function WordCloud(canvas: HTMLCanvasElement | string, options: WordCloudOptions): void;
  export = WordCloud;
}
