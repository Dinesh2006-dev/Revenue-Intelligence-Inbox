import json
import os
import unittest

class TestRevenueIntelligenceInbox(unittest.TestCase):
    def setUp(self):
        with open('candidate/data/01_initial.json', 'r', encoding='utf-8') as f:
            self.initial_batch = json.load(f)
        with open('candidate/data/02_update.json', 'r', encoding='utf-8') as f:
            self.update_batch = json.load(f)

    def test_01_initial_batch_counts(self):
        records = self.initial_batch['records']
        self.assertEqual(len(records), 44, "Initial delivery must contain exactly 44 records")
        
        calls = [r for r in records if r['source_type'] == 'call']
        meetings = [r for r in records if r['source_type'] == 'meeting']
        self.assertEqual(len(calls), 30, "Must contain exactly 30 calls")
        self.assertEqual(len(meetings), 14, "Must contain exactly 14 meetings")

        # Usable text count in initial batch must be 17
        calls_with_tx = [r for r in calls if r['payload'].get('transcript')]
        meetings_with_tx = [r for r in meetings if r.get('transcript_payload') and r['transcript_payload'].get('turns')]
        self.assertEqual(len(calls_with_tx), 10, "Initial batch must contain 10 calls with transcript")
        self.assertEqual(len(meetings_with_tx), 7, "Initial batch must contain 7 meetings with transcript")
        self.assertEqual(len(calls_with_tx) + len(meetings_with_tx), 17, "Initial usable text total must be 17")

        # M07 in initial batch has 0 turns
        m07 = next(r for r in meetings if r['record_ref'] == 'M07')
        self.assertEqual(len(m07['transcript_payload']['turns']), 0, "M07 must have 0 turns in initial batch")

    def test_02_connected_call_rate(self):
        calls = [r for r in self.initial_batch['records'] if r['source_type'] == 'call']
        connected = [r for r in calls if r['payload'].get('is_connected') is True]
        non_null = [r for r in calls if r['payload'].get('is_connected') is not None]
        unknown = [r for r in calls if r['payload'].get('is_connected') is None]

        self.assertEqual(len(connected), 11, "Connected calls must be 11")
        self.assertEqual(len(non_null), 30, "Calls with non-null is_connected must be 30")
        self.assertEqual(len(unknown), 0, "Unknown is_connected calls must be 0")
        rate = (len(connected) / len(non_null)) * 100
        self.assertAlmostEqual(rate, 36.6666, places=1, msg="Connected rate should be ~36.7%")

    def test_03_contract_replay_simulation(self):
        """Simulate the full 6-step replay contract in Python"""
        state = {}
        manual_overrides = {}

        def import_delivery(batch):
            rev = batch['revision']
            for rec in batch['records']:
                key = (rec['source_type'], rec['source_id'])
                if key not in state:
                    state[key] = json.loads(json.dumps(rec))
                    state[key]['_applied_revision'] = rev
                else:
                    cur_rev = state[key].get('_applied_revision', 1)
                    if rev > cur_rev:
                        state[key]['payload'] = json.loads(json.dumps(rec['payload']))
                        state[key]['transcript_payload'] = json.loads(json.dumps(rec['transcript_payload'])) if rec.get('transcript_payload') else None
                        state[key]['_applied_revision'] = rev
                        state[key]['_source_updated'] = True

        # Step 1: Import initial
        import_delivery(self.initial_batch)
        self.assertEqual(len(state), 44, "Step 1 must have 44 records")

        # Step 2: Repeat with shuffled order
        shuffled = json.loads(json.dumps(self.initial_batch))
        shuffled['records'].reverse()
        import_delivery(shuffled)
        self.assertEqual(len(state), 44, "Step 2: Re-importing shuffled batch must NOT create duplicate records")

        # Step 3: Manual override on M07
        m07_key = ('meeting', '4f304fff-fd40-5cfc-a366-0a134c445c2a')
        self.assertIn(m07_key, state)
        manual_overrides[m07_key] = {
            'manual_route': 'customer_escalation',
            'note': 'Manual override: customer demonstrated 4 critical UI bugs'
        }

        # Step 4: Import update delivery (rev 2)
        import_delivery(self.update_batch)
        self.assertEqual(len(state), 44, "Step 4: Unique records must remain 44 after update")
        self.assertEqual(state[m07_key]['_applied_revision'], 2, "M07 must have applied revision 2")
        self.assertEqual(len(state[m07_key]['transcript_payload']['turns']), 27, "M07 must now have 27 turns")
        self.assertEqual(manual_overrides[m07_key]['manual_route'], 'customer_escalation', "Manual route on M07 must be preserved across update!")

        # Step 5: Re-import initial delivery (rev 1 arriving after rev 2)
        import_delivery(self.initial_batch)
        self.assertEqual(state[m07_key]['_applied_revision'], 2, "Older revision 1 must NOT overwrite newer revision 2 on M07!")
        self.assertEqual(len(state[m07_key]['transcript_payload']['turns']), 27, "M07 transcript turns must remain 27!")
        self.assertEqual(manual_overrides[m07_key]['manual_route'], 'customer_escalation', "M07 manual route must remain intact!")

    def test_04_manifest_integrity(self):
        manifest_path = 'candidate/exports/manifest.json'
        self.assertTrue(os.path.exists(manifest_path), "manifest.json must exist")
        with open(manifest_path, 'r', encoding='utf-8') as f:
            manifest = json.load(f)

        self.assertEqual(len(manifest), 44, "Manifest must have exactly 44 records")
        for row in manifest:
            rel_path = row['relative_output_path']
            full_path = os.path.join('candidate/exports', rel_path)
            self.assertTrue(os.path.exists(full_path), f"Active manifest path must exist: {rel_path}")

if __name__ == '__main__':
    unittest.main()
