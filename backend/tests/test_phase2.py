def test_auth_and_me(client,auth):
    assert client.get("/auth/me",headers=auth).json()["email"]=="test@example.com"
    assert client.post("/auth/login",json={"email":"test@example.com","password":"wrong"}).status_code==401
    assert client.post("/auth/register",json={"name":"Other","email":"test@example.com","password":"Password1"}).status_code==409
    assert client.post("/auth/register",json={"name":"Bad","email":"bad@example.com","password":"bad@pw"}).status_code==422
    assert client.patch("/auth/me",headers=auth,json={"name":"Updated User"}).json()["name"]=="Updated User"
    assert client.post("/auth/change-password",headers=auth,json={"current_password":"Password1","new_password":"Newpass2"}).status_code==204

def test_forms_are_owned_and_editable(client,auth):
    created=client.post("/forms/",headers=auth,json={"title":"Original"}); assert created.status_code==201
    form_id=created.json()["id"]
    assert client.patch(f"/forms/{form_id}",headers=auth,json={"title":"Updated"}).json()["title"]=="Updated"
    other=client.post("/auth/register",json={"name":"Other","email":"other@example.com","password":"Password1"}).json()
    assert client.get(f"/forms/{form_id}",headers={"Authorization":f"Bearer {other['access_token']}"}).status_code==403
    assert client.delete(f"/forms/{form_id}",headers=auth).status_code==204
    assert client.get(f"/forms/{form_id}",headers=auth).status_code==404

def test_fields_versions_share_and_submission_snapshot(client,auth):
    form=client.post("/forms/",headers=auth,json={"title":"Frozen survey"}).json(); fid=form["id"]
    field=client.post(f"/forms/{fid}/fields",headers=auth,json={"label":"Email","field_type":"email","required":True,"display_order":1}).json()
    rule=client.post(f"/forms/fields/{field['id']}/validation-rules",headers=auth,json={"rule_type":"email"}); assert rule.status_code==201
    published=client.post(f"/forms/{fid}/publish",headers=auth); assert published.status_code==201
    link=client.post(f"/forms/{fid}/generate-link",headers=auth).json()["link_token"]
    assert client.patch(f"/forms/{fid}",headers=auth,json={"title":"Draft title"}).status_code==200
    assert client.get(f"/public/forms/{link}").json()["title"]=="Frozen survey"
    assert client.post(f"/public/forms/{link}/submit",json={"values":{}}).status_code==422
    submitted=client.post(f"/public/forms/{link}/submit",json={"values":{str(field['id']):"person@example.com"}}); assert submitted.status_code==201
    responses=client.get(f"/forms/{fid}/responses",headers=auth).json(); assert responses["total"]==1
    assert client.get(f"/forms/{fid}/responses/{submitted.json()['id']}",headers=auth).status_code==200
    assert client.get(f"/forms/{fid}/responses/export/excel",headers=auth).headers["content-type"].startswith("application/vnd.openxmlformats")
    assert client.get(f"/forms/{fid}/responses/export/pdf",headers=auth).headers["content-type"]=="application/pdf"
    assert client.get(f"/forms/{fid}/responses/export/csv",headers=auth).headers["content-type"].startswith("text/csv")

def test_option_crud_and_reorder(client,auth):
    fid=client.post("/forms/",headers=auth,json={"title":"Options"}).json()["id"]
    field=client.post(f"/forms/{fid}/fields",headers=auth,json={"label":"Choice","field_type":"dropdown"}).json()
    a=client.post(f"/forms/{fid}/fields/{field['id']}/options",headers=auth,json={"option_label":"A","option_value":"a"}).json()
    b=client.post(f"/forms/{fid}/fields/{field['id']}/options",headers=auth,json={"option_label":"B","option_value":"b"}).json()
    response=client.patch(f"/forms/{fid}/fields/{field['id']}/options/reorder",headers=auth,json={"options":[{"option_id":b["id"],"display_order":1},{"option_id":a["id"],"display_order":2}]})
    assert response.status_code==200

def test_admin_management_and_cannot_create_forms(client,auth,admin_auth):
    analytics=client.get("/dashboard/admin",headers=admin_auth);assert analytics.status_code==200
    assert {"forms_by_status","users_by_role","responses_over_time","forms_over_time"}.issubset(analytics.json())
    users=client.get("/admin/users",headers=admin_auth).json()["items"];target=next(user for user in users if user["email"]=="test@example.com")
    assert {"forms_count","response_count"}.issubset(target)
    assert client.patch(f"/admin/users/{target['id']}/status",headers=admin_auth,json={"is_active":False}).json()["is_active"] is False
    assert client.post("/forms/",headers=admin_auth,json={"title":"Forbidden"}).status_code==403
