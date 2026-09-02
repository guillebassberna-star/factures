const { jsPDF } = window.jspdf;
const STORAGE = "factures-proba-settings-v1";
const baseline = { year: 2026, month: 10, A: 11, nineA: 19, nineB: 20 };
const clients = [
  {key:"nineA", short:"Local 9A", company:"TELIEMPORDA, SL", tax:"B17549924", address:"C. Alba 3, local 9A", city:"17230 Palamós", base:1167.19, supplierTax:"E55317424", tel:"619930903", concept:"Lloguer del local 9A, situat al carrer Alba, 3 de Palamós"},
  {key:"nineB", short:"Local 9B", company:"ACTIVIDADES DE RESTAURACIÓN Y OCIO NOCTURNO, SL", tax:"B56225733", address:"Carrer Alba, 3, local B", city:"17230 Palamós", base:889.50, supplierTax:"E55317424", tel:"619930903", concept:"Lloguer del local 9B, situat al carrer Alba, 3 de Palamós"},
  {key:"A", short:"Av. Llibertat 3", company:"Gemma Calvet Farràs", tax:"40531002B", address:"Casa Pedralta, Paratge Bujonis, S/n", city:"17220 Sant Feliu de Guíxols", base:549.55, supplierTax:"E02723773", concept:"Lloguer del local situat a l'av. Llibertat, 3 de Palamós", own:true}
];
let settings = JSON.parse(localStorage.getItem(STORAGE)||"null") || Object.fromEntries(clients.map(c=>[c.key,{price:c.base, ipc:0}]));
let selected = new Set(JSON.parse(localStorage.getItem("factures-proba-selected-v1")||"null") || clients.map(c=>c.key));
let attachments = [];
const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat("ca-ES",{style:"currency",currency:"EUR"}).format(n);
const monthLabel = value => new Intl.DateTimeFormat("ca-ES",{month:"long",year:"numeric"}).format(new Date(`${value}-01`));
function monthData(){const [y,m]=($("period").value||"2026-10").split("-").map(Number);return {year:y,month:m};}
function numberFor(c){const d=monthData();const delta=(d.year-baseline.year)*12+d.month-baseline.month;const n=baseline[c.key]+delta;return `${c.key==='A'?'A':'C'}${d.year}-${String(n).padStart(5,"0")}`;}
function current(c){const s=settings[c.key]||{price:c.base,ipc:0};return +(s.price*(1+(s.ipc||0)/100)).toFixed(2);}
function render(){
  $("clients").innerHTML=clients.map(c=>`<article class="client-card"><div class="client-top"><h3>${c.short}</h3><label class="client-check"><input data-select="${c.key}" type="checkbox" ${selected.has(c.key)?"checked":""}> Incloure</label></div><div class="address">${c.company}<br>${c.address}<br>${c.city}</div><div class="invoice-no">${numberFor(c)}</div><div class="fields"><label>Preu base<input data-key="${c.key}" data-field="price" type="number" min="0" step="0.01" value="${(settings[c.key]?.price??c.base).toFixed(2)}"></label><label>IPC (%)<input data-key="${c.key}" data-field="ipc" type="number" step="0.1" value="${settings[c.key]?.ipc??0}"></label></div><div class="amounts"><span>Base imposable<br><strong>${money(current(c))}</strong></span><span style="text-align:right">Total<br><strong>${money(total(current(c)))}</strong></span></div></article>`).join("");
  $("summary").textContent=`${selected.size} de ${clients.length} factures preparades per a ${monthLabel($("period").value)}`;
  document.querySelectorAll("input[data-key]").forEach(i=>i.addEventListener("input",()=>{settings[i.dataset.key][i.dataset.field]=Number(i.value)||0;localStorage.setItem(STORAGE,JSON.stringify(settings));render();}));
  document.querySelectorAll("input[data-select]").forEach(i=>i.addEventListener("change",()=>{i.checked?selected.add(i.dataset.select):selected.delete(i.dataset.select);localStorage.setItem("factures-proba-selected-v1",JSON.stringify([...selected]));render();}));
  $("attachment-list").innerHTML=attachments.map((a,i)=>`<div class="attachment-item"><span class="attachment-name">${escapeHtml(a.name)} <small>(${formatBytes(a.size)})</small></span><button class="attachment-remove" data-attachment="${i}" type="button">Eliminar</button></div>`).join("");
  document.querySelectorAll("[data-attachment]").forEach(b=>b.addEventListener("click",()=>{attachments.splice(Number(b.dataset.attachment),1);render();}));
}
function total(base){return +(base+round(base*.21)-round(base*.19)).toFixed(2)}
function round(n){return Math.round((n+Number.EPSILON)*100)/100}
function formatBytes(n){return n<1024?`${n} B`:`${(n/1024).toFixed(1)} KB`}
function escapeHtml(s){return s.replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[ch]))}
function reset(){settings=Object.fromEntries(clients.map(c=>[c.key,{price:c.base,ipc:0}]));localStorage.setItem(STORAGE,JSON.stringify(settings));render()}
function openReview(){const d=monthData(),chosen=clients.filter(c=>selected.has(c.key));if(!chosen.length){alert("Selecciona almenys una factura.");return}const note=$("comments").value.trim();const attached=attachments.length?` També hi ha ${attachments.length} document${attachments.length===1?" adjunt":"s adjunts"} a la revisió.`:"";$("review-copy").textContent=`Es generaran ${chosen.length} PDF${chosen.length===1?"":"s"} amb data 01/${String(d.month).padStart(2,"0")}/${d.year}${note?". El comentari de revisió s’ha desat en aquest dispositiu.":"."}${attached}`;$("review-list").innerHTML=chosen.map(c=>`<li><span>${c.short}</span><strong>${numberFor(c)} · ${money(total(current(c)))}</strong></li>`).join("");$("confirm").textContent=`Descarregar ${chosen.length===1?"la factura":"les factures seleccionades"}`;$("review").classList.remove("hidden")}
function closeReview(){$("review").classList.add("hidden")}
function text(c,s){return s}
function addText(c,s,x,y,size=10,bold=false){c.setFont(bold?"helvetica":"helvetica",bold?"bold":"normal");c.setFontSize(size);c.text(text(c,s),x,y)}
function rightText(c,s,x,y,size=10,bold=false){c.setFont("helvetica",bold?"bold":"normal");c.setFontSize(size);c.text(text(c,s),x,y,{align:"right"})}
function addFit(c,s,x,y,maxWidth,size=10,bold=false){let n=size;c.setFont("helvetica",bold?"bold":"normal");c.setFontSize(n);while(n>8&&c.getTextWidth(text(c,s))>maxWidth){n-=.25;c.setFontSize(n)}c.text(text(c,s),x,y)}
function pdfFor(client){
  const d=monthData(), base=current(client), iva=round(base*.21), irpf=round(base*.19), grand=+(base+iva-irpf).toFixed(2), doc=new jsPDF({unit:"pt",format:"a4"}), W=595.28,L=34,R=34,HX=296,HR=W-R;
  doc.setTextColor(0);doc.setFillColor(217,217,217);doc.rect(HX,54,HR-HX,23,"F");addText(doc,"FACTURA",HX+3,70,13,true);rightText(doc,numberFor(client),HR-3,70,13,true);addText(doc,"Data",HX+3,94,11);rightText(doc,`01/${String(d.month).padStart(2,"0")}/${d.year}`,HR-3,94,11);
  addText(doc,client.own?"BERNABEU OLIVER CB":"BERNABEU-BASSETS CB",L,160,10,true);addFit(doc,client.company,HX+3,160,HR-HX-6,10,true);addText(doc,client.supplierTax,L,178,10,true);addText(doc,client.tax,HX+3,178,10,true);addText(doc,"Av. Llibertat, 1",L,196);addText(doc,client.address,HX+3,196);addText(doc,"17230 Palamós",L,214);addText(doc,client.city,HX+3,214);if(client.tel)addText(doc,`Telf.: ${client.tel}`,L,232);
  const month=new Intl.DateTimeFormat("ca-ES",{month:"long"}).format(new Date(d.year,d.month-1));doc.setFillColor(217,217,217);doc.rect(L,223,W-L-R,24,"F");addText(doc,"Concepte",L+4,239,10,true);doc.text("IVA",411,239,{align:"center"});rightText(doc,"Import",HR-7,239,10,true);doc.setLineWidth(2);doc.line(L,247,HR,247);addFit(doc,`${client.concept}, ${month.toUpperCase()}`,L+4,261,315,10);addText(doc,`${d.year}.`,L+4,279);doc.text("21 %",411,261,{align:"center"});rightText(doc,money(base),HR-7,261);
  rightText(doc,"Base Imposable",493,332);rightText(doc,money(base),HR-7,332);rightText(doc,"IVA 21 %",493,350);rightText(doc,money(iva),HR-7,350);rightText(doc,"Retenció IRPF 19 %",493,368);rightText(doc,`-${money(irpf)}`,HR-7,368);doc.setFillColor(238,238,238);doc.rect(HX+26,374,HR-(HX+26),20,"F");doc.setFillColor(0);doc.setFont("helvetica","bold");doc.setFontSize(10);doc.text("Total",430,389);const totalText=money(grand);doc.text(totalText,HR-7-doc.getTextWidth(totalText),389);
  addText(doc,"Podeu fer l'ingrés al compte bancari:",L+4,770);addText(doc,`IBAN: ${client.own?"ES8721000028710200787236":"ES8721000028710200787236"}`,L+17,786);doc.text("Pàgina 1 / 1",W/2,817,{align:"center"});return doc;
}
function downloadAll(){clients.filter(c=>selected.has(c.key)).forEach(c=>pdfFor(c).save(`FACTURA ${monthLabel($("period").value).toUpperCase()} - ${c.short.toUpperCase()}.pdf`));closeReview()}
$("comments").value=localStorage.getItem("factures-proba-comments-v1")||"";$("comments").addEventListener("input",()=>localStorage.setItem("factures-proba-comments-v1",$("comments").value));$("attachments").addEventListener("change",e=>{attachments.push(...Array.from(e.target.files));e.target.value="";render()});$("period").addEventListener("change",render);$("reset").addEventListener("click",reset);$("download-selected").addEventListener("click",openReview);$("download-all").addEventListener("click",()=>{selected=new Set(clients.map(c=>c.key));localStorage.setItem("factures-proba-selected-v1",JSON.stringify([...selected]));render();openReview()});$("confirm").addEventListener("click",downloadAll);$("cancel").addEventListener("click",closeReview);$("close-review").addEventListener("click",closeReview);render();
