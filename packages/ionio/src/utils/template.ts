import { Argument, encodeArgument } from '../Argument';
import { Parameter } from '../Artifact';

export function replaceTemplateWithConstructorArg(
  template: string,
  constructorInputs: Parameter[],
  constructorArguments: Argument[]
): string {
  // it's a template string?
  if (template.startsWith('$')) {
    const withoutDollar = template.slice(1);
    // it's a template string among parameters?
    const position = constructorInputs.findIndex(p => p.name === withoutDollar);
    if (position === -1) {
      throw new Error(`${withoutDollar} not found in constructorInputs`);
    }

    return encodeArgument(
      constructorArguments[position],
      constructorInputs[position].type
    ).toString('hex');
  }

  // it's a hexadecimal string?
  if (template.startsWith('0x')) {
    return template.slice(2);
  }

  return template;
}
