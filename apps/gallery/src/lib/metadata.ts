// SPDX-License-Identifier: Apache-2.0
import type { FieldStep, JsonNode, SummaryField } from './types';

export function resolveField(root:JsonNode, path:FieldStep[]):JsonNode|undefined {
  let node:JsonNode|undefined=root;
  for (const step of path) {
    if (step.kind==='index') node=node?.type==='array' ? node.items[step.index] : undefined;
    else {
      let found:JsonNode|undefined; let occurrence=0;
      if(node?.type==='object') for(const member of node.members) {
        if(member.key===step.key && occurrence++===step.occurrence) {found=member.value;break;}
      }
      node=found;
    }
    if (node===undefined) return undefined;
  }
  return node;
}
export function valueText(node:JsonNode|undefined):string {
  if (node===undefined) return 'Missing';
  if (node.type==='null') return 'null';
  if (node.type==='boolean') return String(node.value);
  if (node.type==='string') return JSON.stringify(node.value);
  if (node.type==='number') return node.value;
  if (node.type==='array') return node.items.length ? 'Array ('+node.items.length+')' : '[]';
  return node.members.length ? 'Object ('+node.members.length+' members)' : '{}';
}
export function sameField(a:SummaryField,b:SummaryField) {return a.source===b.source && JSON.stringify(a.path)===JSON.stringify(b.path);}
export function fieldLabel(path:FieldStep[]) {return '$'+path.map(step=>step.kind==='index' ? '['+step.index+']' : '['+JSON.stringify(step.key)+']'+(step.occurrence ? ' occurrence '+(step.occurrence+1) : '')).join('');}
