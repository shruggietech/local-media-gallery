// SPDX-License-Identifier: Apache-2.0
'use client';
import {type ReactNode, type RefObject, useLayoutEffect, useRef} from 'react';
import {Button} from '@brand/web/react/server';
import {ArrowLeft, ChevronRight, X} from 'lucide-react';
import {navigation, parentRoute, routeTitle, type NavigationAction, type NavigationRoute} from './navigation';

export function ApplicationNavigation({route, navigate, close, action, invoker, unavailable, children}: {
  route: NavigationRoute | null; navigate: (route: NavigationRoute) => void; close: () => void;
  action: (action: NavigationAction) => void; invoker: RefObject<HTMLElement | null>;
  unavailable: (action: NavigationAction) => boolean; children: ReactNode;
}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const title=useRef<HTMLHeadingElement>(null);
  const backTarget=useRef<string|null>(null);
  useLayoutEffect(()=>{
    const element=dialog.current;if(!element)return;
    if(route!==null){
      if(!element.open)element.showModal();
      const target=backTarget.current;
      backTarget.current=null;
      const button=target?[...element.querySelectorAll<HTMLElement>('[data-navigation-entry]')].find(n=>n.dataset.navigationEntry===target)?.querySelector<HTMLButtonElement>('button'):null;
      (button??title.current)?.focus({preventScroll:true});
      element.scrollTop=0;
    }else if(element.open){
      element.close();
      const target=invoker.current;
      const fallback=document.querySelector<HTMLElement>('.media-viewer[open] [data-navigation-trigger] button')??document.querySelector<HTMLElement>('.app-header [data-navigation-trigger] button')??document.getElementById('bb-main');
      (target?.isConnected&&!target.closest('[inert]')?target:fallback)?.focus({preventScroll:true});
    }
  },[route,invoker]);
  const category=navigation.find(n=>n.id===route);
  const back=()=>{
    if(!route)return;const parent=parentRoute(route);if(!parent)return;
    backTarget.current=route;navigate(parent);
  };
  return <dialog ref={dialog} className="bb-dialog application-drawer" aria-labelledby="navigation-title" aria-modal="true" data-navigation-protocol="drawer-v1"
    onCancel={event=>{event.preventDefault();event.stopPropagation();close();}}
    onKeyDown={event=>{
      event.stopPropagation();
      if(event.key==='Escape'){event.preventDefault();close();return;}
      if(event.key!=='Tab')return;
      const nodes=[...event.currentTarget.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href],[tabindex="0"],summary')].filter(n=>!n.matches(':disabled')&&n.getClientRects().length>0&&!n.closest('[hidden]'));
      const first=nodes[0],last=nodes.at(-1);if(!first){event.preventDefault();title.current?.focus();return;}
      if(event.shiftKey&&(document.activeElement===first||document.activeElement===title.current)){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&(document.activeElement===title.current||document.activeElement===last||!event.currentTarget.contains(document.activeElement))){event.preventDefault();first.focus();}
    }}>
    <header className="navigation-header">
      {route&&route!=='menu'?<Button variant="ghost" onClick={back}><ArrowLeft aria-hidden="true"/>Back</Button>:<span/>}
      <Button variant="ghost" onClick={close} aria-label="Close menu"><X aria-hidden="true"/>Close</Button>
    </header>
    <h2 ref={title} id="navigation-title" tabIndex={-1}>{route?routeTitle(route):'Menu'}</h2>
    <div className="navigation-content">
      {route==='menu'?<nav aria-label="Application categories" className="navigation-list">{navigation.map(n=><span key={n.id} data-navigation-entry={n.id}><Button variant="ghost" onClick={()=>navigate(n.id)}>{n.label}<ChevronRight aria-hidden="true"/></Button></span>)}</nav>
        :category?<nav aria-label={category.label+' actions'} className="navigation-list">{category.items.map(item=><span key={item.id} data-navigation-entry={item.id}><Button variant="ghost" disabled={item.action?unavailable(item.id):false} onClick={()=>item.action?action(item.id):navigate(item.id)}>{item.label}{!item.action?<ChevronRight aria-hidden="true"/>:null}</Button></span>)}</nav>
          :children}
    </div>
  </dialog>;
}
