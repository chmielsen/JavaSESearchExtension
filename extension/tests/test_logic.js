TEST_CLASSES = [
    {
        "classname": "AbstractAction",
        "link": "javax/swing/AbstractAction.html",
        "fullname": "javax.swing.AbstractAction",
        "type": "class"
    },
    {
        "classname": "AbstractAnnotationValueVisitor6",
        "link": "javax/lang/model/util/AbstractAnnotationValueVisitor6.html",
        "fullname": "javax.lang.model.util.AbstractAnnotationValueVisitor6",
        "type": "class"
    },
    {
        "classname": "AbstractAnnotationValueVisitor7",
        "link": "javax/lang/model/util/AbstractAnnotationValueVisitor7.html",
        "fullname": "javax.lang.model.util.AbstractAnnotationValueVisitor7",
        "type": "class"
    },
    {
        "classname": "AbstractAnnotationValueVisitor8",
        "link": "javax/lang/model/util/AbstractAnnotationValueVisitor8.html",
        "fullname": "javax.lang.model.util.AbstractAnnotationValueVisitor8",
        "type": "class"
    },
    {
        "classname": "AbstractBorder",
        "link": "javax/swing/border/AbstractBorder.html",
        "fullname": "javax.swing.border.AbstractBorder",
        "type": "class"
    },
]

describe("Non web logic", function() {
  expected = [{
        "classname": "AbstractAction",
        "link": "javax/swing/AbstractAction.html",
        "fullname": "javax.swing.AbstractAction",
        "type": "class"
    }];
  it("class matcher for Action", function() {
    expect(matchFullname("action", TEST_CLASSES)).toEqual(expected);
  })
});
