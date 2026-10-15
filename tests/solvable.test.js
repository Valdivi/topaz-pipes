const E=require(require('path').join(__dirname,'..','js','engine.js'));
const C=require('assert');
global.window={};require(require('path').join(__dirname,'..','js','config.js'));const CF=window.CONFIG;
function rng(s){return function(){s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
// brute: any assignment of allowed rotations so dest reachable from origin? DFS over cells choosing rotation lazily
function solvable(b){
  const R=b.rows,Cc=b.cols;
  const dirs=[[-1,0,E.N,E.S],[0,1,E.E,E.W],[1,0,E.S,E.N],[0,-1,E.W,E.N*0+E.E]];
  // simple path search: path cells need rotation providing in & out
  const seen=new Set();
  function rots(cell){return cell.locked?[cell.rot]:[0,1,2,3].map(x=>x)}
  function mask(cell,t){return E.rotMask(E.BASE[cell.type],t)}
  const o=[0,0],d=[R-1,Cc-1];
  function dfs(r,c,inDir,vis){ // arrived at (r,c) via side inDir (mask bit of this cell facing prev) 
    if(r===d[0]&&c===d[1]) return true;
    const cell=b.cells[r][c];
    for(const t of rots(cell)){const m=mask(cell,t); if(inDir&&!(m&inDir))continue;
      for(const [dr,dc,out,opp] of [[-1,0,E.N,E.S],[0,1,E.E,E.W],[1,0,E.S,E.N],[0,-1,E.W,E.E]]){
        if(!(m&out))continue; if(inDir&&out===inDir)continue;
        const nr=r+dr,nc=c+dc; if(nr<0||nc<0||nr>=R||nc>=Cc||vis.has(nr*9+nc))continue;
        const nv=new Set(vis);nv.add(nr*9+nc);
        if(dfs(nr,nc,opp,nv))return true;}}
    return false;}
  // origin tile is fixed mask E|S ; dest N|W
  const oc=b.cells[0][0];
  return dfs0();
  function dfs0(){const m=E.maskOf?E.maskOf(oc):(E.E|E.S);
    for(const [dr,dc,out,opp] of [[0,1,E.E,E.W],[1,0,E.S,E.N]]){const nv=new Set([0,dr*9+dc]);if(dfs(dr,dc,opp,nv))return true}return false}
}
let bad=0,n=0;
for(let s=1;s<=1500;s++){const b=E.generate(Object.assign({},CF.grid,CF,{rng:rng(s)}));n++;
 // origin/dest representation check
 if(!solvable(b)){bad++; if(bad<4)console.log('unsolvable seed',s)}}
console.log('tableros sin solución:',bad,'de',n); if(bad) process.exit(1);
