export function registerAbortControllerSerializers(superjson: any) {
  superjson.registerCustom(
    {
      isApplicable: (v: any): v is AbortController => v instanceof AbortController,
      serialize: (controller: AbortController) => ({
        aborted: controller.signal.aborted,
        reason: controller.signal.reason,
      }),
      deserialize: (data: { aborted: boolean; reason?: any }) => {
        const controller = new AbortController();
        if (data.aborted) controller.abort(data.reason);
        return controller;
      },
    },
    'AbortController',
  );

  superjson.registerCustom(
    {
      isApplicable: (v: any): v is AbortSignal => v instanceof AbortSignal,
      serialize: (signal: AbortSignal) => ({
        aborted: signal.aborted,
        reason: signal.reason,
      }),
      deserialize: (data: { aborted: boolean; reason?: any }) => {
        const controller = new AbortController();
        if (data.aborted) controller.abort(data.reason);
        return controller.signal;
      },
    },
    'AbortSignal',
  );
}

export function findAbortSignalInArgs(args: any[]): AbortSignal | undefined {
  for (const arg of args) {
    if (arg instanceof AbortSignal) {
      return arg;
    }
    if (arg && typeof arg === 'object') {
      for (const key in arg) {
        if (arg[key] instanceof AbortSignal) {
          return arg[key];
        }
        if (arg[key] instanceof AbortController) {
          return arg[key].signal;
        }
      }
    }
  }
  return undefined;
}

export function replaceAbortSignalsInArgs(args: any[], newSignal: AbortSignal): any[] {
  return args.map((arg) => {
    if (arg instanceof AbortSignal) {
      return newSignal;
    }
    if (arg instanceof AbortController) {
      const controller = new AbortController();
      newSignal.addEventListener('abort', () => controller.abort(newSignal.reason));
      return controller;
    }
    if (arg && typeof arg === 'object' && !Array.isArray(arg)) {
      const newArg = { ...arg };
      for (const key in newArg) {
        if (newArg[key] instanceof AbortSignal) {
          newArg[key] = newSignal;
        }
        if (newArg[key] instanceof AbortController) {
          const controller = new AbortController();
          newSignal.addEventListener('abort', () => controller.abort(newSignal.reason));
          newArg[key] = controller;
        }
      }
      return newArg;
    }
    return arg;
  });
}
