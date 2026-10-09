# S3 lifecycle

**`sherwyn-whizz-away`** (all app documents: employee, truck and trailer docs, fuel slips, statements, POs). Versioning has been enabled since 2026-10-09, so a document deleted or overwritten by the app (`deleteObject` in the employee, truck, assignment and PO controllers) can be restored for 90 days. `docs-bucket-lifecycle.json` expires old versions after 90 days and removes leftover delete markers and abandoned multipart uploads.

Restore a deleted document by removing its delete marker:
`aws s3api list-object-versions --bucket sherwyn-whizz-away --prefix <key>`, then
`aws s3api delete-object --bucket sherwyn-whizz-away --key <key> --version-id <delete-marker-version-id>`.

Versioning can only be *suspended*, never fully turned off again.

**`whizz-away-versions-prod`** holds a copy of each deploy zip made by the GitHub Actions workflow. EB doesn't read it: `beanstalk-deploy` uploads its own copy to `elasticbeanstalk-af-south-1-490004616745/Whizz-Away/`. `versions-bucket-lifecycle.json` expires these copies after 30 days.

**EB application versions** are capped at 30 by the application's version lifecycle setting, which also deletes the source bundles. EB never deletes the version that is currently deployed.
