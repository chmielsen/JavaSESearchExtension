import json
import urllib2
import pprint
from bs4 import BeautifulSoup

HEADERS = {'User-Agent': 'Mozilla/5.0'}

JAVASE_8_LINK = 'https://docs.oracle.com/javase/8/docs/api/allclasses-noframe.html'

AUTO_GENERATED_WARNING = """
/*
 * This file is auto-generated. Do not modify it by hand, 
 * make modifications to gen_classes_descs.py.
 */
"""

LICENSE="""/*
 * Copyright 2012 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
"""

def dump_as_json(classesDict, varname="XML_DATA"):
    return "var {} = {}".format(varname, (json.dumps(classesDict, indent=4)))
    

def parse_url_to_classes(url):
    plain_text_java_docs = get_plain_text_site(url)
    java_docs_tree = BeautifulSoup(plain_text_java_docs, 'html.parser')
    rows = java_docs_tree.find('', {'class' : 'indexContainer'}).find_all('a')
    return map(parse_row, rows)

def parse_row(row):
    (type, package) = row.get('title').split(' in ')
    classname = row.get_text()
    return {'classname' : classname, 'fullname' : package + "." + classname, 'type' : type}

def get_plain_text_site(url):
    req = urllib2.Request(url, None, HEADERS)
    try:
        resp = urllib2.urlopen(req)
    except urllib2.HTTPError, e:
        print >> sys.stderr, "404 " + url
        raise e
    return resp.read()



if __name__ == '__main__':
    jdoc = parse_url_to_classes(JAVASE_8_LINK)
    print LICENSE
    print AUTO_GENERATED_WARNING
    print dump_as_json(jdoc)
