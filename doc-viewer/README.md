# Document Viewer

Renders documents (markdown, pdf, html, images, ...) in `/config/docs`.

## Ingress

The addon uses what Home Assistant calls "ingress" for access to benefit from Home Assistant's authentication. This has two implications:

1. Directory upload is limited to "small" size (not sure how much, but too small for me). Use samba or something like that.
2. With ingress, the URL of the app becomes something like `https://example.com/hassio/ingress/cb8b6b11_doc-viewer`. Nothing except query parameters can be appended to this path. E.g.

```http
# base url (serves ui)
https://example.com/hassio/ingress/cb8b6b11_doc-viewer  

# query parameters, accepted
https://example.com/hassio/ingress/cb8b6b11_doc-viewer?path=/api/file/my_dir/info.md


# Supervisor: Unable to fetch add-on info to start Ingress
https://example.com/hassio/ingress/cb8b6b11_doc-viewer/api/file/my_dir/info.md    
```

The app transforms all urls from the 3rd to the 2nd form.