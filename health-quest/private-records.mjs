// Account-bound Health Quest storage. No model calls or shared Quest memory.
export function privateRecords(client, expectedUser) {
  if (!expectedUser) throw new Error('Sign in to Health Quest.');
  async function account() {
    const { data, error } = await client.auth.getUser();
    if (error || data?.user?.id !== expectedUser) throw new Error('Account changed. Reopen Health Quest.');
  }
  return {
    async list() {
      await account();
      const { data, error } = await client.from('health_quest_records').select('*')
        .eq('owner_id', expectedUser).neq('state', 'deleted').order('created_at');
      if (error) throw new Error('Health Quest could not load your records.');
      await account();
      return data;
    },
    async save({ id, kind, text, state = 'reported', followup = false,
      occurredAt = null, revision = 0, actionId, approved = false }) {
      if (approved !== true) throw new Error('Review and approve before saving.');
      if (!['goal', 'observation'].includes(kind) || typeof text !== 'string' ||
          !text.trim() || text.length > 2000 || !actionId || !id ||
          !['planned', 'reported', 'paused', 'completed', 'deleted'].includes(state) ||
          !Number.isInteger(revision) || revision < 0 || typeof followup !== 'boolean') {
        throw new Error('Invalid Health Quest record.');
      }
      await account();
      const { data, error } = await client.rpc('health_quest_save_record', {
        p_expected_user: expectedUser, p_id: id, p_kind: kind, p_text: text.trim(),
        p_state: state, p_followup: followup, p_occurred_at: occurredAt,
        p_revision: revision, p_action_id: actionId, p_approved: true
      });
      if (error) throw new Error('Record was not confirmed saved. Reload before trying again.', { cause: error });
      await account();
      if (!data || data.id !== id) throw new Error('Save could not be confirmed.');
      return data;
    }
  };
}
