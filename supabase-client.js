(function(){
  const config=window.SUPABASE_CONFIG||{};
  const configured=Boolean(window.supabase&&config.url&&config.anonKey&&!config.url.startsWith('PENDIENTE_')&&!config.anonKey.startsWith('PENDIENTE_'));
  const client=configured?window.supabase.createClient(config.url,config.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
  const assert=()=>{if(!client)throw new Error('SUPABASE_NOT_CONFIGURED')};
  const normalizeEvent=row=>({id:row.id,title:row.title,description:row.description,date:row.event_date,time:String(row.event_time).slice(0,5),place:row.place,capacity:Number(row.capacity),registered_count:Number(row.registered_count||0)});
  const normalizeRegistration=row=>({id:row.id,eventId:row.event_id,firstName:row.first_name,lastName:row.last_name,birthDate:row.birth_date,createdAt:row.created_at,eventTitle:row.events?.title||''});
  const normalizeMessage=row=>({id:row.id,name:row.name,email:row.email,message:row.message,read:row.is_read,createdAt:row.created_at});
  const normalizeTransaction=row=>({id:row.id,type:row.type,concept:row.concept,amount:Number(row.amount),date:row.transaction_date});
  const unwrap=(result)=>{if(result.error)throw result.error;return result.data};
  window.SevillejaDB={
    configured,client,
    async getSession(){assert();return (await client.auth.getSession()).data.session},
    async signIn(email,password){assert();return unwrap(await client.auth.signInWithPassword({email,password}))},
    async signOut(){assert();return unwrap(await client.auth.signOut())},
    async isAdmin(){assert();return Boolean(unwrap(await client.rpc('is_current_user_admin')))},
    onAuthStateChange(callback){if(!client)return null;return client.auth.onAuthStateChange(callback)},
    async getEvents(){assert();return unwrap(await client.from('events').select('*').order('event_date')).map(normalizeEvent)},
    async createEvent(event){assert();return normalizeEvent(unwrap(await client.from('events').insert({title:event.title,description:event.description,event_date:event.date,event_time:event.time,place:event.place,capacity:event.capacity}).select().single()))},
    async updateEvent(event){assert();return normalizeEvent(unwrap(await client.from('events').update({title:event.title,description:event.description,event_date:event.date,event_time:event.time,place:event.place,capacity:event.capacity}).eq('id',event.id).select().single()))},
    async deleteEvent(id){assert();unwrap(await client.from('events').delete().eq('id',id))},
    async registerEvent(payload){assert();return unwrap(await client.rpc('register_for_event',{p_event_id:payload.eventId,p_first_name:payload.firstName,p_last_name:payload.lastName,p_birth_date:payload.birthDate}))},
    async getRegistrations(){assert();return unwrap(await client.from('event_registrations').select('*,events(title)').order('created_at',{ascending:false})).map(normalizeRegistration)},
    async deleteRegistration(id){assert();unwrap(await client.from('event_registrations').delete().eq('id',id))},
    async sendMessage(message){assert();unwrap(await client.from('messages').insert({name:message.name,email:message.email,message:message.message,is_read:false}))},
    async getMessages(){assert();return unwrap(await client.from('messages').select('*').order('created_at',{ascending:false})).map(normalizeMessage)},
    async setMessageRead(id,isRead){assert();unwrap(await client.from('messages').update({is_read:isRead}).eq('id',id))},
    async deleteMessage(id){assert();unwrap(await client.from('messages').delete().eq('id',id))},
    async getTransactions(){assert();return unwrap(await client.from('transactions').select('*').order('transaction_date',{ascending:false})).map(normalizeTransaction)},
    async createTransaction(transaction){assert();return normalizeTransaction(unwrap(await client.from('transactions').insert({type:transaction.type,concept:transaction.concept,amount:transaction.amount,transaction_date:transaction.date}).select().single()))},
    async deleteTransaction(id){assert();unwrap(await client.from('transactions').delete().eq('id',id))}
  };
})();
