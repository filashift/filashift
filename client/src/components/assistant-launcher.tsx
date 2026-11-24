import { lazy, Suspense, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { useLang } from "@/lib/i18n";
const Help=lazy(()=>import("./assistant"));
export function Assistant(){
  const [open,setOpen]=useState(false),es=useLang()==="es",label=es?"Pregunta a FilaShift":"Ask FilaShift";
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline" size="sm" aria-label={label} title={label}><MessageCircle className="h-4 w-4"/><span className="hidden xl:inline">{es?"Ayuda":"Ask"}</span></Button></DialogTrigger>{open&&<Suspense fallback={<DialogContent><DialogTitle>{label}</DialogTitle><p>{es?"Cargando…":"Loading…"}</p></DialogContent>}><Help close={()=>setOpen(false)}/></Suspense>}</Dialog>;
}
