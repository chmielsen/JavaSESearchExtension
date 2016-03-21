#!/usr/bin/python

import sys
import json
import os
import os.path
import urllib2
import pprint
import threading
from bs4 import BeautifulSoup

HEADERS = {'User-Agent': 'Mozilla/5.0'}

JAVASE_8_LINK = 'https://docs.oracle.com/javase/8/docs/api/allclasses-noframe.html'

AUTO_GENERATED_WARNING = """
/*
 * This file is auto-generated. Do not modify it by hand, 
 * make modifications to gen_classes_descs.py.
 */
"""

class CrawlClassThread(threading.Thread):
    CLASS_DIR = 'classes/'

    def __init__(self, link, classname):
        threading.Thread.__init__(self)
        self._link = link
        self._classname = classname
   
    def run(self):
        if os.path.isfile(self.get_filename()):
            # pass file already exists
            # print >> sys.stderr, "Skipping " + self._classname + ", file already exists" 
            return 
        print >> sys.stderr, "Crawling " + self._classname + " ..."
        try:
            class_tree = BeautifulSoup(get_plain_text_site(self._link), 'html.parser')
            class_members = class_tree.findAll('', {'class' : 'memberNameLink'})
            self.write_members(class_members)
        except Exception as e:
            print >> sys.stderr, "Exception: " + str(e) + ", bad link: " + self._link

    def join(self, timeout=None):
        threading.Thread.join(self, timeout)

    def get_filename(self):
        return self.CLASS_DIR + self._classname

    def write_members(self, class_members):
        filen = self.get_filename()
        with open(filen, 'wb') as wfile:
            for member in class_members:
                wfile.write(member.prettify('utf-8'))

def crawl_java_methods():
    jdoc = parse_url_to_classes(JAVASE_8_LINK)
    uriPrefix = 'https://docs.oracle.com/javase/8/docs/api/' 
    classLinks = map(lambda cl: (uriPrefix + cl['link'], cl['fullname']), jdoc)
    threads = []
    for (link, fullname) in classLinks:
        crawl_thread = CrawlClassThread(link, fullname)
        crawl_thread.start()
        threads.append(crawl_thread)
    for t in threads:
        t.join()

# get attributes and methods from crawled files
def parse_attr_files():
    def get_methods_and_fields_from_file(fd, classname):
        html = BeautifulSoup(fd.read(), "html.parser")
        all_attr = html.findAll('a')
        methods = []
        fields = []
        for attr in all_attr:
            attrStrip = attr.getText().strip()
            href = attr.get('href').strip().replace('../', '')
            if href[-1] == '-':
                if not contains_attr(methods, attrStrip):
                    # is a method
                    methods.append((attrStrip, href))
            elif not contains_attr(fields, attrStrip):
                if not is_internal_class(classname, attrStrip):
                    fields.append((attrStrip, href))
        return (methods, fields)
        
    FILES_DIR = 'classes'
    onlyfiles = [f for f in os.listdir(FILES_DIR) if os.path.isfile(os.path.join(FILES_DIR, f))]
    # classname => {'methods' : [String], 'fields' : [String]}
    classesDict = dict()
    for classname in onlyfiles:
        with open(os.path.join(FILES_DIR, classname), 'rb') as fd:
            (methods, fields) = get_methods_and_fields_from_file(fd, classname)
            classesDict[classname] = {'methods' : methods, 'fields' : fields}
    return classesDict

def contains_attr(list_of_pairs, attr):
    attrs_to_check = [el[0] for el in list_of_pairs]
    return attr in attrs_to_check

def is_internal_class(classname, attr):
    simple_name = classname.split('.')[-1]
    return simple_name in attr

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
    link = package.replace('.', '/') + '/' + classname + ".html"
    return {'classname' : classname,
            'fullname' : package + "." + classname,
            'type' : type,
            'link' : link}

def get_plain_text_site(url):
    req = urllib2.Request(url, None, HEADERS)
    try:
        resp = urllib2.urlopen(req)
    except urllib2.HTTPError, e:
        print >> sys.stderr, "404 " + url
        raise e
    return resp.read()



if __name__ == '__main__':
    if len(sys.argv) > 1:
        if sys.argv[1] == 'members':
            # check if need to crawl methods
            crawl_java_methods()
        elif sys.argv[1] == 'parse_attr':
            classesDict = parse_attr_files()
            print AUTO_GENERATED_WARNING
            print dump_as_json(classesDict, 'CLASS_ATTRIBUTES_DATA')
    else:
        jdoc = parse_url_to_classes(JAVASE_8_LINK)
        print AUTO_GENERATED_WARNING
        print dump_as_json(jdoc)
