s = '[à®Žà®¨] à®…à®ªà®ªà®²à®‡à®šà®…à®Ÿà®‡à®’à®¨'
with open('out.txt', 'w', encoding='utf-8') as f:
    f.write('Original: ' + s + '\n')
    try:
        f.write('Decoded: ' + s.encode('cp1252').decode('utf-8') + '\n')
    except Exception as e:
        f.write('Error: ' + str(e) + '\n')
