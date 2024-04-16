import type webpack from 'webpack';
import { transform } from '@babel/core';
import { plugins } from '.';
import { logger } from './utils';

export default async function (
  this: LoaderThis<any>,
  source: string,
  map: any,
) {
  const callback = this.async();
  if (typeof map === 'string') {
    map = JSON.parse(map);
  }
  try {
    const options = this.getOptions();
    

    const res = transform(source || '', {
      babelrc: false,
      sourceType: 'module',
      plugins: plugins(options) as any,
      filename: this.resourcePath,

      // cwd: process.cwd(),
      inputSourceMap: map,
      sourceMaps: true,

      // cwd: this.context,
    });

    if (res) {
      const sourcemap = JSON.stringify(res.map, null, 2);
      // logger.log('sourcemap', sourcemap);
      callback(null, res?.code || '', sourcemap || undefined);
    } else {
      logger.error('no result');
      callback(null, source, map);
    }
  } catch (e: any) {
    logger.error(e);
    callback(e);
  }
}

export type LoaderThis<Options> = {
  /**
   * Path to the file being loaded
   *
   * https://webpack.js.org/api/loaders/#thisresourcepath
   */
  resourcePath: string;

  /**
   * Function to add outside file used by loader to `watch` process
   *
   * https://webpack.js.org/api/loaders/#thisadddependency
   */
  addDependency: (filepath: string) => void;

  /**
   * Marks a loader result as cacheable.
   *
   * https://webpack.js.org/api/loaders/#thiscacheable
   */
  cacheable: (flag: boolean) => void;

  /**
   * Marks a loader as asynchronous
   *
   * https://webpack.js.org/api/loaders/#thisasync
   */
  async: webpack.LoaderContext<any>['async'];

  /**
   * Return errors, code, and sourcemaps from an asynchronous loader
   *
   * https://webpack.js.org/api/loaders/#thiscallback
   */
  callback: webpack.LoaderContext<any>['callback'];
  /**
   * Loader options in Webpack 5
   *
   * https://webpack.js.org/api/loaders/#thisgetoptionsschema
   */
  getOptions: () => Options;
};
