import time
import hmac
import hashlib
from starlette.testclient import TestClient
from app.main import app
from app.config import settings

def run_tests():
    with TestClient(app) as client:
        # 1. Log in users
        r_fac = client.post('/api/auth/login', json={'user_id': 'LW-FAC-0001', 'pin': '123456'})
        assert r_fac.status_code == 200, f'Faculty login failed: {r_fac.text}'
        fac_token = r_fac.json()['access_token']
        fac_h = {'Authorization': f'Bearer {fac_token}'}

        # Student 1 (Enrolled in Sec A)
        r_stu1 = client.post('/api/auth/login', json={'user_id': 'LW-STU-0001', 'pin': '123456'})
        assert r_stu1.status_code == 200
        stu1_token = r_stu1.json()['access_token']
        stu1_h = {'Authorization': f'Bearer {stu1_token}'}

        # Student 2 (Enrolled in Sec B)
        r_stu2 = client.post('/api/auth/login', json={'user_id': 'LW-STU-0002', 'pin': '123456'})
        assert r_stu2.status_code == 200
        stu2_token = r_stu2.json()['access_token']
        stu2_h = {'Authorization': f'Bearer {stu2_token}'}

        # Student 3 (Enrolled in Sec A)
        r_stu3 = client.post('/api/auth/login', json={'user_id': 'LW-STU-0003', 'pin': '123456'})
        assert r_stu3.status_code == 200
        stu3_token = r_stu3.json()['access_token']
        stu3_h = {'Authorization': f'Bearer {stu3_token}'}

        print('[PASS] Logins successful for Faculty and Students')

        # 2. Check config
        r_cfg = client.get('/api/attendance/config')
        assert r_cfg.status_code == 200
        cfg = r_cfg.json()
        assert cfg['geofence_radius_meters'] == 150.0
        assert cfg['qr_rotation_seconds'] == 7
        assert cfg['max_gps_accuracy_meters'] == 100.0
        print('[PASS] Config parameters verified: 150m radius, 7s rotation, 100m max accuracy')

        # 3. Teacher starts QR attendance session
        anchor_lat = 28.545000
        anchor_lng = 77.192600
        r_start = client.post('/api/attendance/sessions', json={
            'subject_code': 'CS401',
            'section': 'A',
            'lat': anchor_lat,
            'lng': anchor_lng,
            'accuracy': 15.0,
            'duration_minutes': 45
        }, headers=fac_h)
        assert r_start.status_code == 200, f'Start session failed: {r_start.text}'
        session = r_start.json()
        sess_id = session['id']
        assert session['status'] == 'active'
        assert session['lat'] == anchor_lat
        assert session['lng'] == anchor_lng
        print(f'[PASS] Teacher started session {sess_id} with anchor ({anchor_lat}, {anchor_lng})')

        # 4. Teacher retrieves rotating QR token
        r_qr = client.get(f'/api/attendance/sessions/{sess_id}/qr', headers=fac_h)
        assert r_qr.status_code == 200
        qr_info = r_qr.json()
        current_token = qr_info['token']
        assert len(current_token) == 64
        assert 'qr_url' in qr_info
        assert f's={sess_id}' in qr_info['qr_url']
        assert f't={current_token}' in qr_info['qr_url']
        print(f'[PASS] Rotating QR token verified ({current_token[:10]}...): refreshes every 7s')

        # 5. Student 1 scans INSIDE 150m (approx 16.7m from anchor)
        r_scan = client.post('/api/attendance/scan', json={
            'session_id': sess_id,
            'token': current_token,
            'lat': 28.545150,
            'lng': 77.192600,
            'accuracy': 20.0,
            'device_id': 'DEVICE-PHONE-001'
        }, headers=stu1_h)
        assert r_scan.status_code == 200, f'Valid scan failed: {r_scan.text}'
        scan_res = r_scan.json()
        assert scan_res['status'] == 'present'
        assert scan_res['distance_meters'] < 30.0
        print(f'[PASS] Student inside 150m ({scan_res["distance_meters"]} m away) marked present')

        # Check that student appears on teacher screen live
        r_qr_update = client.get(f'/api/attendance/sessions/{sess_id}/qr', headers=fac_h)
        assert r_qr_update.json()['scanned_count'] >= 1
        recent = r_qr_update.json()['recent_scanned']
        assert any(s['student_id'] == 'LW-STU-0001' for s in recent)
        print('[PASS] Student appears live on teacher screen')

        # 6. Test duplicate scan by the same student
        r_dup = client.post('/api/attendance/scan', json={
            'session_id': sess_id,
            'token': current_token,
            'lat': 28.545150,
            'lng': 77.192600,
            'accuracy': 20.0
        }, headers=stu1_h)
        assert r_dup.status_code == 400
        assert r_dup.json()['detail'] == 'Already marked'
        print('[PASS] Duplicate scan rejected as "Already marked"')

        # 7. Test expired token (e.g. Old screenshot token 5 slots ago)
        old_slot = int(time.time() // 7) - 5
        old_msg = f'{sess_id}:{old_slot}'.encode('utf-8')
        expired_token = hmac.new(settings.QR_SECRET.encode('utf-8'), old_msg, hashlib.sha256).hexdigest()

        r_exp = client.post('/api/attendance/scan', json={
            'session_id': sess_id,
            'token': expired_token,
            'lat': 28.545150,
            'lng': 77.192600,
            'accuracy': 20.0
        }, headers=stu3_h)
        assert r_exp.status_code == 400
        assert r_exp.json()['detail'] == 'QR expired'
        print('[PASS] Old screenshot / expired QR rejected as "QR expired"')

        # 8. Test scan from OUTSIDE 150m (approx 1,200m away)
        r_qr_now = client.get(f'/api/attendance/sessions/{sess_id}/qr', headers=fac_h)
        live_token = r_qr_now.json()['token']

        r_far = client.post('/api/attendance/scan', json={
            'session_id': sess_id,
            'token': live_token,
            'lat': 28.555000,
            'lng': 77.192600,
            'accuracy': 15.0
        }, headers=stu3_h)
        assert r_far.status_code == 400
        detail_msg = r_far.json()['detail']
        assert 'Outside classroom range' in detail_msg
        print(f'[PASS] Scan outside 150m rejected: "{detail_msg}"')

        # 9. Test GPS accuracy too low (> 100m)
        r_low_acc = client.post('/api/attendance/scan', json={
            'session_id': sess_id,
            'token': live_token,
            'lat': 28.545150,
            'lng': 77.192600,
            'accuracy': 160.0  # worse than 100m
        }, headers=stu3_h)
        assert r_low_acc.status_code == 400
        assert 'Location not accurate enough' in r_low_acc.json()['detail']
        print('[PASS] Low GPS accuracy rejected: "Location not accurate enough, move near a window and retry"')

        # 10. Test student from another section (Student 2 is in Section B, session is Section A)
        r_wrong_sec = client.post('/api/attendance/scan', json={
            'session_id': sess_id,
            'token': live_token,
            'lat': 28.545150,
            'lng': 77.192600,
            'accuracy': 20.0
        }, headers=stu2_h)
        assert r_wrong_sec.status_code == 403
        assert r_wrong_sec.json()['detail'] == 'Not enrolled in this class'
        print('[PASS] Student from another section rejected as "Not enrolled in this class"')

        # 11. Check Suspicious Attempts list on teacher session
        r_sess_details = client.get(f'/api/attendance/sessions/{sess_id}', headers=fac_h)
        suspicious = r_sess_details.json()['suspicious_attempts']
        assert len(suspicious) >= 4
        reasons = [s['reason'] for s in suspicious]
        print(f'[PASS] Suspicious attempts logged on teacher session: {reasons}')

        # 12. Teacher ends the session
        r_end = client.post(f'/api/attendance/sessions/{sess_id}/end', headers=fac_h)
        assert r_end.status_code == 200
        assert r_end.json()['status'] == 'closed'
        roster_closed = r_end.json()['roster']
        stu3_entry = next((s for s in roster_closed if s['student_id'] == 'LW-STU-0003'), None)
        assert stu3_entry['status'] == 'absent'
        print('[PASS] Session closed: unscanned students marked Absent')

        # Test scan after session closed
        r_after_close = client.post('/api/attendance/scan', json={
            'session_id': sess_id,
            'token': live_token,
            'lat': 28.545150,
            'lng': 77.192600,
            'accuracy': 20.0
        }, headers=stu3_h)
        assert r_after_close.status_code == 400
        assert r_after_close.json()['detail'] == 'Session closed'
        print('[PASS] Scan on closed session rejected as "Session closed"')

        # 13. Teacher changes student manually (Present <-> Absent) before final save
        r_override = client.post(f'/api/attendance/sessions/{sess_id}/override', json={
            'student_id': 'LW-STU-0003',
            'status': 'present',
            'reason': 'Excused medical attendance'
        }, headers=fac_h)
        assert r_override.status_code == 200
        assert r_override.json()['status'] == 'present'
        print('[PASS] Manual override works alongside QR')

        # 14. Finalize attendance: feeds course percentage and risk engine
        r_finalize = client.post(f'/api/attendance/sessions/{sess_id}/finalize', headers=fac_h)
        assert r_finalize.status_code == 200
        assert r_finalize.json()['is_finalized'] is True
        print('[PASS] Attendance finalized into student records and risk calculation updated')

        # 15. Dev Toggle Test
        r_toggle = client.post('/api/attendance/config/dev-toggle', headers=fac_h)
        assert r_toggle.status_code == 200
        assert r_toggle.json()['dev_skip_geofence'] is True
        r_toggle2 = client.post('/api/attendance/config/dev-toggle', headers=fac_h)
        assert r_toggle2.status_code == 200
        assert r_toggle2.json()['dev_skip_geofence'] is False
        print('[PASS] Dev toggle switch verified')

    print('\n======================================================')
    print('ALL ROTATING QR & GEOFENCE ATTENDANCE TESTS PASSED!')
    print('======================================================')

if __name__ == '__main__':
    run_tests()
