Title: Storing images (or files) on S3 with Django
Date: 2014-05-04 08:09
Modified: 2010-12-05 19:30
Category: Django
Tags: s3, django
Slug: s3-storage-with-django
Authors: Aaron Romeo
Summary: Getting that clutter off your server so it can serve your all important code

There comes a time when you need to upload stuff to your server via your Django app. You can upload it to the machine serving up your app (which isn't a good idea in most cases) or upload it to a server/service which specializes in delivering you content. Enter S3.

Django and S3 to play nice is pretty straightforward. This tutorial/guide/journal assumes a few things.

 - You already have a basic Django app of somes sorts and need to add image upload functionality
 - You know how to configure your AWS S3 account and a bucket configured
 - Since (in my case) this is specific to images I also have [Pillow](http://pillow.readthedocs.org/en/latest/) installed

The majority of this magic is provided via two libraries

 - [django-storages](http://django-storages.readthedocs.org/en/latest/)
 - [boto](https://github.com/boto/boto)

Pip install these libraries...

    pip install django-storages
    pip install boto

Once you got this done, modify your `settings.py` file.

    :::python
    INSTALLED_APPS = (
        #...
        'storages',
        #...
    )

    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto.S3BotoStorage'
    AWS_S3_SECURE_URLS = False                                  # HTTP vs HTTPS
    AWS_QUERYSTRING_AUTH = False                                # Set this to False if you do not want the file being cached as a result of a unique query string being returned for your requests
    AWS_S3_ACCESS_KEY_ID = os.getenv('AWS_S3_ACCESS_KEY_ID')    # Your Amazon Web Services access key, as a string.
    AWS_S3_SECRET_ACCESS_KEY = os.getenv('AWS_S3_SECRET_ACCESS_KEY')    # Your Amazon Web Services secret access key, as a string.
    AWS_STORAGE_BUCKET_NAME = 'yourbucketsname'

Next modify your `models.py` file in the application you want to add this to

    :::python
    import os
    from django.db import models


    def upload_avatar_to(obj, filename):
        filename_base, filename_ext = os.path.splitext(filename)
        s3filename = "profiles/{}{}{}".format(obj.first_name.lower(), obj.last_name.lower(), filename_ext.lower())
        return s3filename


    class Person(models.Model):
        first_name = models.CharField(max_length=50)
        last_name = models.CharField(max_length=50)
        image = models.ImageField(blank=True, upload_to=upload_avatar_to)

        def __unicode__(self):
            return '{} {}'.format(self.first_name, self.last_name)

        class Meta:
            unique_together = ('first_name', 'last_name')
            ordering = ['last_name', 'first_name']

That is it... At this point your images will get punted to S3.


> Written with [StackEdit](https://stackedit.io/).
