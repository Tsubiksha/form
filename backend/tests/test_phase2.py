from app.services.conditional_logic import evaluate_conditional_rules


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

def test_conditional_rule_crud_validation_and_access(client,auth):
    fid=client.post("/forms/",headers=auth,json={"title":"Conditional logic"}).json()["id"]
    trigger=client.post(f"/forms/{fid}/fields",headers=auth,json={"label":"Placement Training","field_type":"radio"}).json()
    target=client.post(f"/forms/{fid}/fields",headers=auth,json={"label":"Training Institute","field_type":"text"}).json()
    payload={"trigger_field_id":trigger["id"],"operator":"equals","comparison_value":"Yes","target_field_id":target["id"],"action":"show"}
    created=client.post(f"/forms/{fid}/rules",headers=auth,json=payload)
    assert created.status_code==201
    assert created.json()["comparison_value"]=="Yes"
    assert client.get(f"/forms/{fid}/rules",headers=auth).json()[0]["id"]==created.json()["id"]
    assert client.post(f"/forms/{fid}/rules",headers=auth,json=payload).status_code==409
    assert client.post(f"/forms/{fid}/rules",headers=auth,json={**payload,"target_field_id":trigger["id"]}).status_code==422
    assert client.post(f"/forms/{fid}/rules",headers=auth,json={**payload,"operator":"greater_than"}).status_code==422
    updated=client.patch(f"/forms/{fid}/rules/{created.json()['id']}",headers=auth,json={"action":"require"})
    assert updated.status_code==200
    assert updated.json()["action"]=="require"
    other=client.post("/auth/register",json={"name":"Other","email":"rules-other@example.com","password":"Password1"}).json()
    other_auth={"Authorization":f"Bearer {other['access_token']}"}
    assert client.get(f"/forms/{fid}/rules",headers=other_auth).status_code==403
    assert client.delete(f"/forms/{fid}/rules/{created.json()['id']}",headers=auth).status_code==204
    assert client.get(f"/forms/{fid}/rules",headers=auth).json()==[]
    list_rule=client.post(f"/forms/{fid}/rules",headers=auth,json={**payload,"operator":"in","comparison_value":"Yes,Maybe"})
    assert list_rule.status_code==201
    assert client.delete(f"/forms/{fid}/rules/{list_rule.json()['id']}",headers=auth).status_code==204

def test_conditional_evaluator_semantics():
    fields=[{"id":1,"label":"Student","field_type":"radio","required":False},{"id":2,"label":"College","field_type":"text","required":True},{"id":3,"label":"Resume","field_type":"file","required":True},{"id":4,"label":"Comments","field_type":"textarea","required":False}]
    rules=[
        {"trigger_field_id":1,"operator":"equals","comparison_value":"Yes","target_field_id":2,"action":"show"},
        {"trigger_field_id":1,"operator":"equals","comparison_value":"Yes","target_field_id":2,"action":"require"},
        {"trigger_field_id":1,"operator":"equals","comparison_value":"No","target_field_id":3,"action":"hide"},
        {"trigger_field_id":1,"operator":"equals","comparison_value":"No","target_field_id":4,"action":"optional"},
    ]
    empty=evaluate_conditional_rules(fields,rules,{})["field_states"]
    assert empty["2"]=={"visible":False,"required":False}
    assert empty["3"]=={"visible":True,"required":True}
    no=evaluate_conditional_rules(fields,rules,{"1":" no "})["field_states"]
    assert no["2"]["visible"] is False
    assert no["3"]=={"visible":False,"required":False}
    yes=evaluate_conditional_rules(fields,rules,{"1":"yes"})["field_states"]
    assert yes["2"]=={"visible":True,"required":True}
    numeric=evaluate_conditional_rules([{"id":5,"required":False},{"id":6,"required":False}],[{"trigger_field_id":5,"operator":"greater_than","comparison_value":"2","target_field_id":6,"action":"show"}],{"5":"10"})["field_states"]
    assert numeric["6"]["visible"] is True
    less_than=evaluate_conditional_rules([{"id":5,"required":False},{"id":6,"required":False}],[{"trigger_field_id":5,"operator":"less_than","comparison_value":"18","target_field_id":6,"action":"hide"}],{"5":"16"})["field_states"]
    assert less_than["6"]["visible"] is False
    rating=evaluate_conditional_rules([{"id":9,"field_type":"rating","required":False},{"id":10,"field_type":"textarea","required":False}],[{"trigger_field_id":9,"operator":"less_than","comparison_value":"3","target_field_id":10,"action":"require"}],{"9":"2"})["field_states"]
    assert rating["10"]["required"] is True
    in_list=evaluate_conditional_rules([{"id":7,"required":False},{"id":8,"required":False}],[{"trigger_field_id":7,"operator":"in","comparison_value":" CSE, AI&DS, IT ","target_field_id":8,"action":"show"}],{"7":"ai&ds"})["field_states"]
    assert in_list["8"]["visible"] is True
    not_in=evaluate_conditional_rules([{"id":7,"required":False},{"id":8,"required":False}],[{"trigger_field_id":7,"operator":"not_in","comparison_value":"CSE,AI&DS,IT","target_field_id":8,"action":"hide"}],{"7":"ECE"})["field_states"]
    assert not_in["8"]["visible"] is False
    array_value=evaluate_conditional_rules([{"id":7,"required":False},{"id":8,"required":False}],[{"trigger_field_id":7,"operator":"in","comparison_value":"CSE,AI&DS,IT","target_field_id":8,"action":"require"}],{"7":["MECH"," IT "]})["field_states"]
    assert array_value["8"]["required"] is True
    bad=evaluate_conditional_rules([{"id":5,"required":False},{"id":6,"required":False}],[{"trigger_field_id":5,"operator":"less_than","comparison_value":"2","target_field_id":6,"action":"show"}],{"5":"abc"})["field_states"]
    assert bad["6"]["visible"] is False

def test_deleting_field_removes_referencing_conditional_rules(client,auth):
    fid=client.post("/forms/",headers=auth,json={"title":"Delete logic"}).json()["id"]
    trigger=client.post(f"/forms/{fid}/fields",headers=auth,json={"label":"Student","field_type":"radio"}).json()
    target=client.post(f"/forms/{fid}/fields",headers=auth,json={"label":"College","field_type":"text"}).json()
    other_trigger=client.post(f"/forms/{fid}/fields",headers=auth,json={"label":"Age","field_type":"number"}).json()
    other_target=client.post(f"/forms/{fid}/fields",headers=auth,json={"label":"Resume","field_type":"file"}).json()
    client.post(f"/forms/{fid}/rules",headers=auth,json={"trigger_field_id":trigger["id"],"operator":"equals","comparison_value":"Yes","target_field_id":target["id"],"action":"show"})
    client.post(f"/forms/{fid}/rules",headers=auth,json={"trigger_field_id":other_trigger["id"],"operator":"greater_than","comparison_value":"18","target_field_id":other_target["id"],"action":"show"})
    deleted=client.delete(f"/forms/{fid}/fields/{trigger['id']}",headers=auth)
    assert deleted.status_code==200
    assert deleted.json()["deleted_rule_count"]==1
    rules=client.get(f"/forms/{fid}/rules",headers=auth).json()
    assert len(rules)==1
    assert rules[0]["target_field_id"]==other_target["id"]

def test_conditional_rules_snapshot_live_submission_and_idempotency(client,auth):
    fid=client.post("/forms/",headers=auth,json={"title":"Placement Registration"}).json()["id"]
    name=client.post(f"/forms/{fid}/fields",headers=auth,json={"label":"Full Name","field_type":"text","required":True,"display_order":1}).json()
    student=client.post(f"/forms/{fid}/fields",headers=auth,json={"label":"Student","field_type":"radio","display_order":2}).json()
    college=client.post(f"/forms/{fid}/fields",headers=auth,json={"label":"College Name","field_type":"text","display_order":3}).json()
    client.post(f"/forms/{fid}/fields/{student['id']}/options",headers=auth,json={"option_label":"Yes","option_value":"Yes","display_order":1})
    client.post(f"/forms/{fid}/fields/{student['id']}/options",headers=auth,json={"option_label":"No","option_value":"No","display_order":2})
    client.post(f"/forms/{fid}/rules",headers=auth,json={"trigger_field_id":student["id"],"operator":"equals","comparison_value":"Yes","target_field_id":college["id"],"action":"show"})
    client.post(f"/forms/{fid}/rules",headers=auth,json={"trigger_field_id":student["id"],"operator":"equals","comparison_value":"Yes","target_field_id":college["id"],"action":"require"})
    assert client.post(f"/forms/{fid}/publish",headers=auth).status_code==201
    token=client.post(f"/forms/{fid}/generate-link",headers=auth).json()["link_token"]
    public=client.get(f"/public/forms/{token}").json()
    assert len(public["conditional_rules"])==2
    hidden_value=client.post(f"/public/forms/{token}/submit",json={"values":{str(name["id"]):"Subiksha",str(student["id"]):"No",str(college["id"]):"Should not submit"}})
    assert hidden_value.status_code==422
    missing_required=client.post(f"/public/forms/{token}/submit",json={"values":{str(name["id"]):"Subiksha",str(student["id"]):"Yes"}})
    assert missing_required.status_code==422
    headers={"Idempotency-Key":"same-submit"}
    payload={"values":{str(name["id"]):"Subiksha",str(student["id"]):"Yes",str(college["id"]):"ABC College"}}
    first=client.post(f"/public/forms/{token}/submit",json=payload,headers=headers)
    second=client.post(f"/public/forms/{token}/submit",json=payload,headers=headers)
    assert first.status_code==201
    assert second.status_code==201
    assert first.json()["id"]==second.json()["id"]
    assert client.get(f"/forms/{fid}/responses",headers=auth).json()["total"]==1

def test_publish_is_idempotent_until_meaningful_changes(client,auth):
    fid=client.post("/forms/",headers=auth,json={"title":"Publish once"}).json()["id"]
    first_field=client.post(f"/forms/{fid}/fields",headers=auth,json={"label":"Name","field_type":"text","required":True,"display_order":1}).json()
    second_field=client.post(f"/forms/{fid}/fields",headers=auth,json={"label":"Age","field_type":"number","display_order":2}).json()
    first=client.post(f"/forms/{fid}/publish",headers=auth)
    assert first.status_code==201
    assert first.json()["version_number"]==1

    unchanged=client.post(f"/forms/{fid}/publish",headers=auth)
    assert unchanged.status_code==200
    assert unchanged.json()["unchanged"] is True
    assert len(client.get(f"/forms/{fid}/versions",headers=auth).json())==1

    same_title=client.patch(f"/forms/{fid}",headers=auth,json={"title":"Publish once"})
    assert same_title.status_code==200
    unchanged_after_updated_at=client.post(f"/forms/{fid}/publish",headers=auth)
    assert unchanged_after_updated_at.status_code==200
    assert unchanged_after_updated_at.json()["version_number"]==1
    assert len(client.get(f"/forms/{fid}/versions",headers=auth).json())==1

    reordered=client.patch(f"/forms/{fid}/fields/reorder",headers=auth,json={"fields":[{"field_id":second_field["id"],"display_order":1},{"field_id":first_field["id"],"display_order":2}]})
    assert reordered.status_code==200
    second=client.post(f"/forms/{fid}/publish",headers=auth)
    assert second.status_code==201
    assert second.json()["version_number"]==2

    created_rule=client.post(f"/forms/{fid}/rules",headers=auth,json={"trigger_field_id":first_field["id"],"operator":"equals","comparison_value":"Subiksha","target_field_id":second_field["id"],"action":"require"})
    assert created_rule.status_code==201
    third=client.post(f"/forms/{fid}/publish",headers=auth)
    assert third.status_code==201
    assert third.json()["version_number"]==3

    updated_rule=client.patch(f"/forms/{fid}/rules/{created_rule.json()['id']}",headers=auth,json={"action":"show"})
    assert updated_rule.status_code==200
    fourth=client.post(f"/forms/{fid}/publish",headers=auth)
    assert fourth.status_code==201
    assert fourth.json()["version_number"]==4

    deleted_rule=client.delete(f"/forms/{fid}/rules/{created_rule.json()['id']}",headers=auth)
    assert deleted_rule.status_code==204
    fifth=client.post(f"/forms/{fid}/publish",headers=auth)
    assert fifth.status_code==201
    assert fifth.json()["version_number"]==5

    link=client.post(f"/forms/{fid}/generate-link",headers=auth).json()["link_token"]
    submitted=client.post(f"/public/forms/{link}/submit",json={"values":{str(first_field["id"]):"Subiksha",""+str(second_field["id"]):"20"}})
    assert submitted.status_code==201
    unchanged_after_response=client.post(f"/forms/{fid}/publish",headers=auth)
    assert unchanged_after_response.status_code==200
    assert unchanged_after_response.json()["version_number"]==5
    assert len(client.get(f"/forms/{fid}/versions",headers=auth).json())==5

def test_admin_management_and_cannot_create_forms(client,auth,admin_auth):
    analytics=client.get("/dashboard/admin",headers=admin_auth);assert analytics.status_code==200
    assert {"forms_by_status","users_by_role","responses_over_time","forms_over_time"}.issubset(analytics.json())
    users=client.get("/admin/users",headers=admin_auth).json()["items"];target=next(user for user in users if user["email"]=="test@example.com")
    assert {"forms_count","response_count"}.issubset(target)
    assert client.patch(f"/admin/users/{target['id']}/status",headers=admin_auth,json={"is_active":False}).json()["is_active"] is False
    assert client.post("/forms/",headers=admin_auth,json={"title":"Forbidden"}).status_code==403
