import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { privateRecords } from './private-records.mjs';

test('real PostgreSQL policies, corrections, retries and deletion with fictional accounts', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'hq-postgres-'));
  const db = new PGlite(directory);
  t.after(async()=>{ if (!db.closed) await db.close(); await rm(directory,{recursive:true,force:true}); });
  const alice = '00000000-0000-4000-8000-000000000001';
  const bob = '00000000-0000-4000-8000-000000000002';
  const id = '00000000-0000-4000-8000-000000000010';
  let action = 100;
  const actionId = () => `00000000-0000-4000-8000-${String(++action).padStart(12,'0')}`;
  await db.exec(`create role anon; create role authenticated;
    create schema auth; grant usage on schema auth to authenticated;
    create function auth.uid() returns uuid language sql stable as
    $$select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid$$;
    create table public.profiles(id uuid primary key);
    insert into public.profiles values('${alice}'),('${bob}');`);
  await db.exec(await readFile(new URL('../supabase/migrations/20261111171532_health_quest_private_records.sql', import.meta.url),'utf8'));
  async function as(user, role='authenticated') {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);
    await db.exec(`set role ${role}`);
  }
  async function save({user=alice, revision=0, text='Afternoon energy', state='reported', aid=actionId(), approved=true, followup=false}={}) {
    return (await db.query('select public.health_quest_save_record($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) as record',
      [user,id,'goal',text,state,followup,null,revision,aid,approved])).rows[0].record;
  }
  await as(alice);
  await t.test('approval required',()=>assert.rejects(save({approved:false}), /Approval required/));
  const aid=actionId();
  await t.test('approved save persists',async()=>assert.equal((await save({aid})).revision,1));
  await t.test('same action retry does not duplicate',async()=>assert.equal((await save({aid})).revision,1));
  await t.test('same action different payload rejected',()=>assert.rejects(save({aid,text:'Different'}),/different input/));
  await as(bob);
  await t.test('other member cannot read',async()=>assert.equal((await db.query('select * from public.health_quest_records')).rows.length,0));
  await t.test('other member cannot update',async()=>assert.equal((await db.query("update public.health_quest_records set text='stolen' returning *")).rows.length,0));
  await t.test('cannot impersonate owner through RPC',()=>assert.rejects(save(),/Account changed/));
  await t.test('cannot insert forged owner',()=>assert.rejects(db.query(`insert into public.health_quest_records(owner_id,id,kind,text,state,revision,last_action_id) values($1,$2,'goal','forged','reported',1,$3)`,[alice,id,actionId()]),/row-level security/));
  await as('', 'anon');
  await t.test('anonymous read denied',()=>assert.rejects(db.query('select * from public.health_quest_records'),/permission denied/));
  await t.test('anonymous RPC denied',()=>assert.rejects(save(),/permission denied/));
  await as(alice);
  await t.test('return visit retrieves original record',async()=>assert.equal((await db.query('select text from public.health_quest_records')).rows[0].text,'Afternoon energy'));
  await t.test('correction saves a new revision',async()=>assert.equal((await save({revision:1,text:'Morning energy',followup:true})).revision,2));
  await t.test('stale correction rejected',()=>assert.rejects(save({revision:1}),/Record changed/));
  await t.test('ownership cannot be reassigned',()=>assert.rejects(db.query('update public.health_quest_records set owner_id=$1,revision=3',[bob]),/identity cannot change/));
  await t.test('audit inaccessible to member',()=>assert.rejects(db.query('select * from health_quest_internal.record_events'),/permission denied/));
  await t.test('stop asking persists false followup',async()=>assert.equal((await save({revision:2,text:'Morning energy',state:'paused'})).followup,false));
  await t.test('delete clears sensitive fields',async()=>{
    const row=await save({revision:3,state:'deleted'});
    assert.equal(row.text,''); assert.equal(row.followup,false);assert.equal(row.occurred_at,null);
  });
  await t.test('deleted record cannot be resurrected',()=>assert.rejects(save({revision:4}),/cannot be restored/));
  await db.exec('reset role');
  await t.test('audit metadata contains no health text',async()=>{
    const events=(await db.query('select * from health_quest_internal.record_events')).rows;
    assert.equal(events.length,4);assert.ok(events.every(e=>!Object.hasOwn(e,'text')));
  });
  await db.close();
  const reopened = new PGlite(directory);
  try {
    await t.test('records survive database restart',async()=>{
      const row=(await reopened.query('select text,state,revision from public.health_quest_records')).rows[0];
      assert.deepEqual(row,{text:'',state:'deleted',revision:4});
    });
  } finally {await reopened.close();}
});

test('application refuses unapproved saves and switched accounts', async()=>{
  const client={auth:{getUser:async()=>({data:{user:{id:'other'}}})}};
  const records=privateRecords(client,'expected');
  await assert.rejects(records.save({}),/approve/);
  await assert.rejects(records.list(),/Account changed/);
});
