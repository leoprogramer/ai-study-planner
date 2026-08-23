/* charts.js - wrappers sobre Chart.js con destrucción segura y soporte de tema */
(function(global){
  'use strict';
  const Charts = {
    _instances:{},
    /** Paleta según tema activo (claro/oscuro). */
    theme(){
      const dark = document.documentElement.getAttribute('data-theme')==='dark';
      return dark
        ? { grid:'#2a2f45', tick:'#a1a8c2', bar:'#e5e7eb', empty:'#343a56', green:'#22c55e', blue:'#60a5fa', blueFill:'rgba(96,165,250,.10)' }
        : { grid:'#f1f1ef', tick:'#6b7280', bar:'#111827', empty:'#e5e7eb', green:'#16a34a', blue:'#2563eb', blueFill:'rgba(37,99,235,.08)' };
    },
    destroy(id){
      if(this._instances[id]){ try{ this._instances[id].destroy(); }catch(e){} delete this._instances[id]; }
    },
    destroyAll(){ Object.keys(this._instances).forEach(k=>this.destroy(k)); },
    _scales(t){
      return {
        y:{ beginAtZero:true, grid:{ color:t.grid }, ticks:{ color:t.tick } },
        x:{ grid:{ display:false }, ticks:{ color:t.tick } }
      };
    },
    doughnut(canvasId, done, pending){
      this.destroy(canvasId);
      const ctx=document.getElementById(canvasId); if(!ctx) return;
      if(typeof Chart==='undefined') return;
      const t=this.theme();
      this._instances[canvasId]=new Chart(ctx, {
        type:'doughnut',
        data:{ labels:['Completado','Pendiente'], datasets:[{ data:[done, pending], borderWidth:0, backgroundColor:[t.green, t.empty] }] },
        options:{ cutout:'68%', plugins:{ legend:{ display:false }, tooltip:{ callbacks:{
          label:(c)=> ` ${c.label}: ${c.parsed} temas` } } } }
      });
    },
    barWeekly(canvasId, weekly){
      this.destroy(canvasId);
      const ctx=document.getElementById(canvasId); if(!ctx) return;
      if(typeof Chart==='undefined') return;
      const t=this.theme();
      this._instances[canvasId]=new Chart(ctx,{
        type:'bar',
        data:{ labels: weekly.map(w=>w.label), datasets:[{ label:'Avance %', data:weekly.map(w=>w.percent), borderRadius:8, backgroundColor:t.bar }] },
        options:{ responsive:true, maintainAspectRatio:false, scales:this._scales(t), plugins:{ legend:{ display:false } } }
      });
    },
    lineHours(canvasId, labels, hours){
      this.destroy(canvasId);
      const ctx=document.getElementById(canvasId); if(!ctx) return;
      if(typeof Chart==='undefined') return;
      const t=this.theme();
      this._instances[canvasId]=new Chart(ctx,{
        type:'line',
        data:{ labels, datasets:[{ label:'Horas', data:hours, tension:.35, fill:true, backgroundColor:t.blueFill, borderColor:t.blue, pointRadius:3 }] },
        options:{ responsive:true, maintainAspectRatio:false, scales:this._scales(t), plugins:{ legend:{ display:false } } }
      });
    }
  };
  global.ASPCharts = Charts;
})(window);
