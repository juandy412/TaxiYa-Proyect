import { drivers } from "../data/drivers";
import type { NotificationItem, Screen, Stored, TripRecord } from "./types";
export const numberCO=(value:number,decimals=0)=>new Intl.NumberFormat("es-CO",{minimumFractionDigits:decimals,maximumFractionDigits:decimals}).format(value);
export const money=(value:number)=>`$ ${numberCO(Math.round(value))}`;
export const distance=(value:number)=>`${numberCO(value,1)} km`;
export const nowLabel=()=>new Date().toLocaleTimeString("es-CO",{hour:"numeric",minute:"2-digit"});
export const firstName=(name:string)=>name.trim().split(/\s+/)[0]||"Hola";
export const initials=(name:string)=>name.trim().split(/\s+/).slice(0,2).map((p)=>p[0]).join("").toUpperCase()||"TY";
export const greeting=()=>{const h=new Date().getHours();return h<12?"Buenos días":h<19?"Buenas tardes":"Buenas noches"};
export const tripDate=(time:number)=>new Date(time).toLocaleString("es-CO",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"});
export const countLabel=(count:number,singular:string,plural=`${singular}s`)=>`${count} ${count===1?singular:plural}`;
export const newNotification=(title:string,text:string,target:Screen):NotificationItem=>({id:`${Date.now()}-${Math.random()}`,title,text,time:nowLabel(),read:false,target});
export const appNotice=(message:string)=>window.dispatchEvent(new CustomEvent("taxiya-notice",{detail:message}));
export function beep(enabled:boolean){if(!enabled)return;try{const c=new AudioContext(),o=c.createOscillator();o.connect(c.destination);o.frequency.value=740;o.start();o.stop(c.currentTime+.14);}catch{}}
export const userTerms=(p:Stored["addressPreference"])=>p==="Pasajera"?{welcome:"Bienvenida",accompanied:"Viaja acompañada"}:p==="Pasajero"?{welcome:"Bienvenido",accompanied:"Viaja acompañado"}:{welcome:"Te damos la bienvenida",accompanied:"Viaja con compañía"};
export const driverAverage=(data:Stored,name:string,fallback:string)=>{const r=data.tripHistory.filter((t)=>t.driver===name&&t.passengerRating).map((t)=>t.passengerRating!.stars);return r.length?(r.reduce((a,b)=>a+b,0)/r.length).toLocaleString("es-CO",{minimumFractionDigits:1,maximumFractionDigits:1}):fallback};
export function tripRecord(data:Stored,status:"Completado"|"Cancelado"):TripRecord{const matched=drivers.find((x)=>x.name===data.selectedDriver);const d=data.selectedDriver===data.driverAccount.name?{name:data.driverAccount.name,plate:data.vehicle.plate}:matched||{name:data.selectedDriver||"Sin asignar",plate:data.vehicle.plate||""};const createdAt=Date.now();return{id:`${createdAt}-${status}`,createdAt,date:tripDate(createdAt),origin:data.origin,destination:data.destination,fare:data.offer,driver:d.name,passenger:data.activePassengerName||data.account?.name||"Persona usuaria",plate:d.plate,shieldChecks:data.shieldChecks,status,paymentMethod:data.paymentMethod,tip:data.tip};}
