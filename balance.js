const $=selector=>document.querySelector(selector);
const KEY='sevilleja_portal_v1';
const defaultTransactions=[
  {id:'t1',type:'income',concept:'Aportaciones actividades',amount:2450,date:'2026-03-01'},
  {id:'t2',type:'income',concept:'Subvención cultural',amount:1800,date:'2026-04-12'},
  {id:'t3',type:'expense',concept:'Material para talleres',amount:760,date:'2026-04-20'},
  {id:'t4',type:'expense',concept:'Sonido y escenario',amount:940,date:'2026-05-18'}
];
function loadTransactions(){try{return JSON.parse(localStorage.getItem(KEY)||'{}').transactions||defaultTransactions}catch{return defaultTransactions}}
let transactions=loadTransactions();
const database=window.SevillejaDB;
const money=value=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(value);
const dateLong=date=>new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'long',year:'numeric'}).format(new Date(date+'T12:00:00'));
const escapeHTML=value=>String(value||'').replace(/[&<>'"]/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));

function render(){
  const start=$('#startDate').value,end=$('#endDate').value;
  if(start&&end&&start>end){$('#filterMessage').textContent='La fecha de inicio no puede ser posterior a la fecha de fin.';return}
  const filtered=transactions.filter(item=>(!start||item.date>=start)&&(!end||item.date<=end)).sort((a,b)=>b.date.localeCompare(a.date));
  const income=filtered.filter(item=>item.type==='income').reduce((sum,item)=>sum+Number(item.amount),0);
  const expense=filtered.filter(item=>item.type==='expense').reduce((sum,item)=>sum+Number(item.amount),0);
  $('#filteredIncome').textContent=money(income);$('#filteredExpense').textContent=money(expense);$('#filteredTotal').textContent=money(income-expense);
  $('#movementCount').textContent=`${filtered.length} movimiento${filtered.length===1?'':'s'}`;
  $('#filterMessage').textContent=start||end?`Periodo mostrado: ${start?dateLong(start):'inicio'} — ${end?dateLong(end):'actualidad'}`:'Mostrando todos los movimientos disponibles.';
  $('#transactionsBody').innerHTML=filtered.length?filtered.map(item=>`<tr><td>${dateLong(item.date)}</td><td><b>${escapeHTML(item.concept)}</b></td><td><span class="public-type ${item.type}">${item.type==='income'?'Ingreso':'Gasto'}</span></td><td class="amount-${item.type}">${item.type==='income'?'+':'−'} ${money(item.amount)}</td></tr>`).join(''):'<tr><td colspan="4" class="no-results">No hay movimientos dentro del periodo seleccionado.</td></tr>';
}
$('#balanceFilter').addEventListener('submit',event=>{event.preventDefault();render()});
$('#clearFilter').addEventListener('click',()=>{$('#balanceFilter').reset();render()});
$('#year').textContent=new Date().getFullYear();
render();
if(database?.configured){database.getTransactions().then(items=>{transactions=items;render()}).catch(error=>{console.error(error);$('#filterMessage').textContent='No se pudieron cargar las cuentas compartidas.'})}
